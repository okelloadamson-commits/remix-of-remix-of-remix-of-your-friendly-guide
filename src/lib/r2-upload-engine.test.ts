import { it } from "node:test";
import { strict as assert } from "node:assert";
import { ResumableUpload, MIN_PART_SIZE, type UploadRecord, type UploadTransport, UploadFailure } from "./r2-upload-engine";

function setup() {
  const calls: number[] = [];
  const saved: UploadRecord[] = [];
  let failures = 0;
  let time = 0;
  const transport: UploadTransport = {
    request: async (action, body) => action === "create" ? { key: "movies/file", uploadId: "session", publicUrl: "https://test.r2.dev/file.mp4" }
      : action === "sign" ? { urls: [{ partNumber: (body.partNumbers as number[])[0], url: String((body.partNumbers as number[])[0]) }] }
      : { publicUrl: "https://test.r2.dev/file.mp4" },
    put: async (url, blob, progress) => {
      calls.push(Number(url));
      progress(blob.size);
      if (Number(url) === 2 && failures++ === 0) throw new Error("Data switched off");
      return `etag-${url}`;
    },
    save: async (record) => { saved.push(structuredClone(record)); },
    online: () => true, wait: async () => {}, now: () => time += 1000,
  };
  return { transport, calls, saved };
}
it("network failure retries the failed part without reuploading confirmed parts", async () => {
  const { transport, calls, saved } = setup();
  const file = new File([new Uint8Array(MIN_PART_SIZE * 2 + 10)], "video.mp4");
  const job = new ResumableUpload(file, "movies", "movies", "same-file", transport);
  await job.start();
  assert.deepEqual(calls, [1, 2, 2, 3]);
  assert.equal(job.snapshot.status, "complete");
  assert.equal(job.snapshot.percent, 100);
  assert.deepEqual(saved.at(-1)?.parts.map((part) => part.partNumber), [1, 2, 3]);
});
it("resuming a saved session skips completed parts", async () => {
  const { transport, calls } = setup();
  const file = new File([new Uint8Array(MIN_PART_SIZE * 2 + 10)], "video.mp4");
  const record: UploadRecord = { scope: "movies", filename: file.name, size: file.size, fingerprint: "same-file",
    partSize: MIN_PART_SIZE, key: "movies/file", uploadId: "session", publicUrl: "https://test.r2.dev/file.mp4", parts: [{ partNumber: 1, etag: "etag-1" }] };
  const job = new ResumableUpload(file, "movies", "movies", "same-file", transport, record);
  await job.start();
  assert.deepEqual(calls, [2, 2, 3]);
  assert.equal(job.snapshot.status, "complete");
});
it("offline upload waits and continues when data returns", async () => {
  const { transport } = setup();
  let connected = false;
  transport.online = () => connected;
  transport.wait = async () => { connected = true; };
  const job = new ResumableUpload(new File(["video"], "video.mp4"), "movies", "movies", "file", transport);
  const states: string[] = [];
  job.subscribe(() => states.push(job.snapshot.status));
  await job.start();
  assert.equal(states.includes("offline"), true);
  assert.equal(job.snapshot.status, "complete");
});
it("authorization and missing ETag failures stop with an actionable error", async () => {
  const { transport } = setup();
  transport.put = async () => { throw new UploadFailure("R2 bucket must expose ETag", true); };
  const job = new ResumableUpload(new File(["video"], "video.mp4"), "movies", "movies", "file", transport);
  await job.start();
  assert.equal(job.snapshot.status, "error");
  assert.equal(job.snapshot.message, "R2 bucket must expose ETag");
});