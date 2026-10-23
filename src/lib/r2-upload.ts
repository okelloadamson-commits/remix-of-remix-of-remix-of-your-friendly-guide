import { auth } from "./firebase";
import { requestR2Upload } from "./api/r2-upload.functions";
import { ResumableUpload, UploadFailure, type UploadRecord, type UploadTransport } from "./r2-upload-engine";

let databasePromise: Promise<IDBDatabase> | undefined;
function database() {
  databasePromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open("luo-admin-uploads", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("sessions", { keyPath: "scope" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new UploadFailure("Upload resume storage is unavailable. Allow browser storage and try again.", true));
  });
  return databasePromise;
}
async function readSession(scope: string): Promise<UploadRecord | undefined> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const request = db.transaction("sessions").objectStore("sessions").get(scope);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function saveSession(record: UploadRecord) {
  const db = await database();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction("sessions", "readwrite");
    transaction.objectStore("sessions").put(record);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(new UploadFailure("Could not save upload progress. Free browser storage before resuming.", true));
  });
}
async function removeSession(scope: string) {
  const db = await database();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction("sessions", "readwrite");
    transaction.objectStore("sessions").delete(scope);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}
async function request(action: "create" | "sign" | "complete" | "abort", body: Record<string, unknown>) {
  const user = auth.currentUser;
  if (!user) throw new UploadFailure("Sign in as admin to upload files.", true);
  const response = await requestR2Upload({ data: { ...body, action, idToken: await user.getIdToken() } });
  if (!response.ok) throw new UploadFailure(response.error, response.status >= 400 && response.status < 500 || response.status === 503);
  return response.result;
}
function put(url: string, blob: Blob, progress: (bytes: number) => void, signal: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const abort = () => xhr.abort();
    if (signal.aborted) { reject(new DOMException("Upload paused", "AbortError")); return; }
    signal.addEventListener("abort", abort, { once: true });
    xhr.open("PUT", url);
    xhr.timeout = 120000;
    // Presigned part PUTs carry no admin credential and no unnecessary headers.
    xhr.upload.onprogress = (event) => progress(event.loaded);
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) { reject(new UploadFailure(`File part failed (${xhr.status}).`)); return; }
      const etag = xhr.getResponseHeader("ETag");
      if (!etag) { reject(new UploadFailure("R2 bucket must expose ETag in its CORS settings before uploads can finish.", true)); return; }
      resolve(etag);
    };
    xhr.onerror = () => reject(new UploadFailure("Network interrupted or R2 bucket CORS blocked the upload."));
    xhr.ontimeout = () => reject(new UploadFailure("File part timed out."));
    xhr.onabort = () => reject(new DOMException("Upload paused", "AbortError"));
    xhr.onloadend = () => signal.removeEventListener("abort", abort);
    xhr.send(blob);
  });
}
const transport: UploadTransport = {
  request, put, save: saveSession, online: () => navigator.onLine, now: () => performance.now(),
  wait: (ms, signal) => new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new DOMException("Upload paused", "AbortError")); return; }
    const finish = () => { clearTimeout(timer); signal.removeEventListener("abort", abort); window.removeEventListener("online", finish); resolve(); };
    const abort = () => { clearTimeout(timer); window.removeEventListener("online", finish); reject(new DOMException("Upload paused", "AbortError")); };
    const timer = setTimeout(finish, ms);
    signal.addEventListener("abort", abort, { once: true });
    window.addEventListener("online", finish, { once: true });
  }),
};

const jobs = new Map<string, ResumableUpload>();
function userScope(scope: string) {
  if (!auth.currentUser) throw new UploadFailure("Sign in as admin to upload files.", true);
  return `${auth.currentUser.uid}:${scope}`;
}
export function getUpload(scope: string) { return auth.currentUser ? jobs.get(userScope(scope)) : undefined; }
export async function getSavedUpload(scope: string) { return readSession(userScope(scope)); }
export async function beginUpload(file: File, scope: string, folder: string) {
  const scoped = userScope(scope);
  if (!file.size) throw new UploadFailure("This file is empty.", true);
  const active = jobs.get(scoped);
  if (active && !["complete", "error", "paused"].includes(active.snapshot.status)) throw new UploadFailure("An upload is already running in this field.", true);
  // Fingerprint first/last MiB in addition to name/size to avoid resuming a different file.
  const sample = await new Blob([file.slice(0, 1024 * 1024), file.slice(Math.max(0, file.size - 1024 * 1024))]).arrayBuffer();
  const fingerprint = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", sample))).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  const saved = await readSession(scoped);
  if (saved && (saved.fingerprint !== fingerprint || saved.size !== file.size || saved.filename !== file.name)) {
    throw new UploadFailure(`Resume requires the original file: ${saved.filename}. Discard that upload to choose another file.`, true);
  }
  const job = new ResumableUpload(file, scoped, folder, fingerprint, transport, saved);
  jobs.set(scoped, job);
  job.subscribe(() => { if (job.snapshot.status === "complete") void removeSession(scoped); });
  return job;
}
export async function discardUpload(scope: string) {
  const scoped = userScope(scope);
  const job = jobs.get(scoped);
  job?.pause();
  const saved = job?.record || await readSession(scoped);
  if (saved && job?.snapshot.status !== "complete") await request("abort", { key: saved.key, uploadId: saved.uploadId });
  jobs.delete(scoped);
  await removeSession(scoped);
}
if (typeof window !== "undefined") window.addEventListener("beforeunload", (event) => {
  if (Array.from(jobs.values()).some((job) => !["complete", "error", "paused"].includes(job.snapshot.status))) {
    event.preventDefault(); event.returnValue = "";
  }
});