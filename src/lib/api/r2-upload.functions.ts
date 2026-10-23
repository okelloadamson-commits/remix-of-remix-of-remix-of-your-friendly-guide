import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { canUploadMedia } from "../upload-policy";

const input = z.object({
  idToken: z.string().min(1).max(10000),
  action: z.enum(["create", "sign", "complete", "abort"]),
  filename: z.string().min(1).max(255).optional(),
  folder: z.string().regex(/^[a-zA-Z0-9/_-]+$/).max(180).optional(),
  key: z.string().min(1).max(500).optional(),
  uploadId: z.string().min(1).max(1000).optional(),
  partNumbers: z.array(z.number().int().min(1).max(10000)).min(1).max(1000).optional(),
  parts: z.array(z.object({ partNumber: z.number().int().min(1).max(10000), etag: z.string().min(1).max(256) })).min(1).max(10000).optional(),
});

export const requestR2Upload = createServerFn({ method: "POST" })
  .inputValidator(input)
  .handler(async ({ data }) => {
    // Validate Firebase identity on the server; a client admin/session flag is not authorization.
    const verification = await fetch(
      "https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=AIzaSyDDxnyI_tieH-VQlzRJnD8Ykb4ric8VgWo",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: data.idToken }),
        signal: AbortSignal.timeout(15000),
      },
    );
    const identity = await verification.json() as { users?: { email?: string; emailVerified?: boolean; disabled?: boolean }[] };
    if (!verification.ok || !canUploadMedia(identity.users?.[0])) {
      return { ok: false as const, status: 403, error: "Only the signed-in admin can upload files." };
    }
    const { default: process } = await import("node:process");
    const token = process.env.R2_UPLOAD_TOKEN;
    if (!token) return { ok: false as const, status: 503, error: "Upload service needs its private token saved once." };

    if (data.action === "create" && (!data.filename || !data.folder)) {
      return { ok: false as const, status: 400, error: "Filename and folder are required." };
    }
    if (data.action !== "create" && (!data.key || !data.uploadId)) {
      return { ok: false as const, status: 400, error: "Upload session is missing." };
    }
    if (data.action === "sign" && !data.partNumbers || data.action === "complete" && !data.parts) {
      return { ok: false as const, status: 400, error: "Upload parts are missing." };
    }
    const { idToken: _token, action, ...body } = data;
    const response = await fetch(`https://r2upload.luoancientmovies-com.workers.dev/uploads/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(45000),
    });
    const result = await response.json() as {
      key?: string; uploadId?: string; publicUrl?: string;
      urls?: { partNumber: number; url: string }[]; error?: string; detail?: string;
    };
    if (!response.ok) {
      return { ok: false as const, status: response.status,
        error: response.status === 401 ? "The saved upload token was rejected by your upload service." : result.detail || result.error || "Upload service failed." };
    }
    return { ok: true as const, result };
  });