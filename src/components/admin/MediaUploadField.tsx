import { useEffect, useRef, useState } from "react";
import { Upload, Pause, Play, RotateCcw, Trash2, Check, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { beginUpload, getUpload, getSavedUpload, discardUpload } from "@/lib/r2-upload";
import { setUploadActive } from "@/lib/upload-activity";
import type { ResumableUpload, UploadSnapshot } from "@/lib/r2-upload-engine";
import { DirectVideoPlayer } from "@/components/movies/DirectVideoPlayer";

interface Props {
  id: string; value: string; onChange: (url: string) => void; scope: string; folder: string;
  accept?: string; required?: boolean; placeholder?: string; video?: boolean;
}
export function formatUploadBytes(bytes: number) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}
export function MediaUploadField({ id, value, onChange, scope, folder, accept, required, placeholder, video }: Props) {
  const holder = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const callback = useRef(onChange);
  callback.current = onChange;
  const [job, setJob] = useState<ResumableUpload | undefined>(() => getUpload(scope));
  const [snapshot, setSnapshot] = useState<UploadSnapshot | undefined>(job?.snapshot);
  const [savedName, setSavedName] = useState("");
  const [error, setError] = useState("");
  const [selecting, setSelecting] = useState(false);
  useEffect(() => {
    if (job) return;
    let live = true;
    getSavedUpload(scope).then((saved) => { if (live) setSavedName(saved?.filename || ""); }).catch(() => {});
    return () => { live = false; };
  }, [scope, job]);
  useEffect(() => {
    if (!job) return;
    const update = () => {
      setSnapshot(job.snapshot);
      if (job.snapshot.status === "complete" && job.snapshot.publicUrl) callback.current(job.snapshot.publicUrl);
    };
    update();
    return job.subscribe(update);
  }, [job]);
  const choose = async (file: File | undefined) => {
    if (!file) return;
    setError(""); setSelecting(true);
    try {
      if (video && !/\.(mp4|m4v|webm|mov)$/i.test(file.name)) throw new Error("Choose an MP4, M4V, WebM or MOV video. MP4 works on most devices.");
      const next = await beginUpload(file, scope, folder);
      setJob(next); setSnapshot(next.snapshot); setSavedName("");
      void next.start();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not start upload."); }
    finally { setSelecting(false); if (input.current) input.current.value = ""; }
  };
  const busy = !!snapshot && !["complete", "error", "paused", "ready"].includes(snapshot.status);
  const incomplete = selecting || !!snapshot && snapshot.status !== "complete";
  const uploading = selecting || (!!snapshot && !["complete", "error", "paused"].includes(snapshot.status));
  useEffect(() => {
    setUploadActive(scope, uploading);
    return () => setUploadActive(scope, false);
  }, [scope, uploading]);
  useEffect(() => {
    const form = holder.current?.closest("form");
    if (!form) return;
    const guard = (event: Event) => {
      if (!incomplete) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setError("Finish or discard the file upload before saving.");
    };
    form.addEventListener("submit", guard, true);
    return () => form.removeEventListener("submit", guard, true);
  }, [incomplete]);
  const discard = async () => {
    setError("");
    try { await discardUpload(scope); setJob(undefined); setSnapshot(undefined); setSavedName(""); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Could not discard upload."); }
  };
  return (
    <div ref={holder} className="min-w-0 space-y-2" data-upload-field={id}>
      <Tabs defaultValue={job || savedName ? "file" : "link"} className="min-w-0">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="link" className="gap-1.5"><LinkIcon className="h-4 w-4 shrink-0" />URL / Drive</TabsTrigger>
          <TabsTrigger value="file" className="gap-1.5"><Upload className="h-4 w-4 shrink-0" />Upload file</TabsTrigger>
        </TabsList>
        <TabsContent value="link">
          <Input id={id} type="url" value={value} onChange={(event) => onChange(event.target.value)} required={required} placeholder={placeholder} disabled={busy} />
        </TabsContent>
        <TabsContent value="file" className="space-y-3">
          <input ref={input} type="file" accept={accept} className="hidden" aria-label={`Choose ${id} file`} onChange={(event) => void choose(event.target.files?.[0])} />
          <Button type="button" variant="outline" className="w-full gap-2" disabled={busy || selecting} onClick={() => input.current?.click()}>
            <Upload className="h-4 w-4 shrink-0" />{selecting ? "Preparing file…" : savedName ? "Reselect file to resume" : "Choose file"}
          </Button>
          {savedName && !job && <div className="flex items-start gap-2 text-xs text-muted-foreground"><span className="min-w-0 flex-1 break-all">Paused: {savedName}</span><Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" aria-label="Discard saved upload" title="Discard saved upload" onClick={() => void discard()}><Trash2 className="h-4 w-4" /></Button></div>}
          {snapshot && <div className="space-y-2" role="status" aria-live="polite">
            <div className="flex items-start justify-between gap-2 text-xs"><span className="min-w-0 break-all text-foreground">{snapshot.filename}</span><span className="shrink-0 font-semibold tabular-nums">{snapshot.percent.toFixed(1)}%</span></div>
            <Progress value={snapshot.percent} className="h-2 bg-muted" aria-label="Upload progress" />
            <div className="flex flex-wrap justify-between gap-1 text-xs text-muted-foreground"><span>{formatUploadBytes(snapshot.uploaded)} / {formatUploadBytes(snapshot.size)}</span><span className="tabular-nums">{formatUploadBytes(snapshot.speed)}/s</span></div>
            <div className="flex items-center justify-between gap-2"><span className="min-w-0 break-words text-xs capitalize">{snapshot.status === "complete" ? <span className="inline-flex items-center gap-1"><Check className="h-3 w-3" />Uploaded</span> : snapshot.message || snapshot.status}</span>
              <div className="flex shrink-0 gap-1">{busy ? <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label="Pause upload" title="Pause upload" onClick={() => job?.pause()}><Pause className="h-4 w-4" /></Button> : snapshot.status !== "complete" && <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label="Resume upload" title="Resume upload" onClick={() => void job?.start()}>{snapshot.status === "error" ? <RotateCcw className="h-4 w-4" /> : <Play className="h-4 w-4" />}</Button>}
              {snapshot.status !== "complete" && <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label="Discard upload" title="Discard upload" onClick={() => void discard()}><Trash2 className="h-4 w-4" /></Button>}</div>
            </div>
          </div>}
          <Input aria-label={`${id} uploaded URL`} type="url" value={value} readOnly required={required} placeholder="Uploaded file URL" className="text-xs" />
        </TabsContent>
      </Tabs>
      {error && <p role="alert" className="break-words text-xs text-destructive">{error}</p>}
      {video && snapshot?.status === "complete" && value && <div className="aspect-video w-full overflow-hidden rounded-md"><DirectVideoPlayer src={value} title="Upload preview" /></div>}
    </div>
  );
}