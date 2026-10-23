export const MIN_PART_SIZE = 8 * 1024 * 1024;
export type UploadStatus = "ready" | "preparing" | "uploading" | "offline" | "retrying" | "paused" | "finalizing" | "complete" | "error";
export interface UploadRecord {
  scope: string;
  filename: string;
  size: number;
  fingerprint: string;
  partSize: number;
  key: string;
  uploadId: string;
  publicUrl: string;
  parts: { partNumber: number; etag: string }[];
}
export interface UploadSnapshot {
  status: UploadStatus;
  filename: string;
  size: number;
  uploaded: number;
  speed: number;
  percent: number;
  message?: string;
  publicUrl?: string;
}
export class UploadFailure extends Error {
  constructor(message: string, public readonly permanent = false) { super(message); }
}
export interface UploadTransport {
  request: (action: "create" | "sign" | "complete", body: Record<string, unknown>) => Promise<{
    key?: string; uploadId?: string; publicUrl?: string; urls?: { partNumber: number; url: string }[];
  }>;
  put: (url: string, blob: Blob, progress: (bytes: number) => void, signal: AbortSignal) => Promise<string>;
  save: (record: UploadRecord) => Promise<void>;
  online: () => boolean;
  wait: (ms: number, signal: AbortSignal) => Promise<void>;
  now: () => number;
}

export function partSizeFor(size: number) { return Math.max(MIN_PART_SIZE, Math.ceil(size / 10000)); }
export function completedBytes(record: UploadRecord) {
  return record.parts.reduce((sum, part) => sum + Math.min(record.partSize, Math.max(0, record.size - (part.partNumber - 1) * record.partSize)), 0);
}

export class ResumableUpload {
  snapshot: UploadSnapshot;
  record: UploadRecord | undefined;
  private controller: AbortController | undefined;
  private running = false;
  private listeners = new Set<() => void>();
  constructor(private file: File, private scope: string, private folder: string, private fingerprint: string,
    private transport: UploadTransport, record?: UploadRecord) {
    this.record = record;
    this.snapshot = { status: "ready", filename: file.name, size: file.size, uploaded: record ? completedBytes(record) : 0, speed: 0, percent: 0 };
    this.emit({});
  }
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private emit(update: Partial<UploadSnapshot>) {
    const next = { ...this.snapshot, ...update };
    next.percent = next.status === "complete" ? 100 : Math.min(99.9, next.size ? next.uploaded / next.size * 100 : 0);
    this.snapshot = next;
    this.listeners.forEach((listener) => listener());
  }
  pause() { this.controller?.abort(); this.emit({ status: "paused", speed: 0, uploaded: this.record ? completedBytes(this.record) : 0 }); }
  private async retry<T>(operation: () => Promise<T>, signal: AbortSignal): Promise<T> {
    let attempt = 0;
    while (!signal.aborted) {
      if (!this.transport.online()) {
        this.emit({ status: "offline", speed: 0, uploaded: this.record ? completedBytes(this.record) : 0, message: "Waiting for connection" });
        await this.transport.wait(1000, signal);
        continue;
      }
      try { return await operation(); }
      catch (error) {
        if (signal.aborted || error instanceof UploadFailure && error.permanent) throw error;
        this.emit({ status: this.transport.online() ? "retrying" : "offline", speed: 0,
          uploaded: this.record ? completedBytes(this.record) : 0,
          message: this.transport.online() ? "Connection interrupted · retrying" : "Waiting for connection" });
        await this.transport.wait(Math.min(15000, 1000 * 2 ** Math.min(attempt++, 4)), signal);
      }
    }
    throw new DOMException("Upload paused", "AbortError");
  }
  async start() {
    if (this.running || this.snapshot.status === "complete") return;
    if (this.file.size === 0) { this.emit({ status: "error", message: "This file is empty." }); return; }
    this.running = true;
    const controller = new AbortController();
    this.controller = controller;
    const signal = controller.signal;
    this.emit({ status: "preparing", message: undefined });
    try {
      if (!this.record) {
        const created = await this.retry(() => this.transport.request("create", { filename: this.file.name, folder: this.folder }), signal);
        if (!created.key || !created.uploadId || !created.publicUrl) throw new UploadFailure("Upload service returned an invalid session.", true);
        this.record = { scope: this.scope, filename: this.file.name, size: this.file.size, fingerprint: this.fingerprint,
          partSize: partSizeFor(this.file.size), key: created.key, uploadId: created.uploadId, publicUrl: created.publicUrl, parts: [] };
        await this.transport.save(this.record);
      }
      const record = this.record;
      const total = Math.ceil(record.size / record.partSize);
      for (let number = 1; number <= total; number++) {
        if (record.parts.some((part) => part.partNumber === number)) continue;
        await this.retry(async () => {
          const signed = await this.transport.request("sign", { key: record.key, uploadId: record.uploadId, partNumbers: [number] });
          const url = signed.urls?.find((part) => part.partNumber === number)?.url;
          if (!url) throw new UploadFailure("Upload service did not sign the file part.", true);
          if (signal.aborted) throw new DOMException("Upload paused", "AbortError");
          const blob = this.file.slice((number - 1) * record.partSize, Math.min(number * record.partSize, record.size));
          const base = completedBytes(record);
          let previous = 0, previousTime = this.transport.now();
          this.emit({ status: "uploading", message: undefined, speed: 0, uploaded: base });
          const etag = await this.transport.put(url, blob, (bytes) => {
            const now = this.transport.now();
            const elapsed = (now - previousTime) / 1000;
            if (elapsed >= 0.4 || bytes === blob.size) {
              this.emit({ uploaded: base + bytes, speed: elapsed > 0 ? (bytes - previous) / elapsed : 0 });
              previousTime = now; previous = bytes;
            }
          }, signal);
          record.parts.push({ partNumber: number, etag });
          await this.transport.save(record);
          this.emit({ uploaded: completedBytes(record) });
        }, signal);
      }
      const result = await this.retry(() => {
        this.emit({ status: "finalizing", speed: 0, message: "Finishing upload" });
        return this.transport.request("complete", { key: record.key, uploadId: record.uploadId, parts: record.parts });
      }, signal);
      this.emit({ status: "complete", uploaded: record.size, speed: 0, message: undefined, publicUrl: result.publicUrl || record.publicUrl });
    } catch (error) {
      if (!signal.aborted) this.emit({ status: "error", speed: 0, message: error instanceof Error ? error.message : "Upload failed." });
    } finally { this.running = false; }
  }
}