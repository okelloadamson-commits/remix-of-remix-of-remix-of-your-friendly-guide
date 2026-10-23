# R2 uploads

Direct file selection is available in Movies, Series, Episodes, Luo Champion, Apps, Adverts and Hero Slides. Existing URL and Google Drive options are retained. Uploaded public URLs save through each form's existing Firebase save operation; wait for **Uploaded**, then save the form.

## One-time connection

Save the deployed upload worker's exact `UPLOAD_TOKEN` privately as `R2_UPLOAD_TOKEN` in the project's secret settings. It is read only on the server; it does not require changing or entering it for every upload. A token in browser code can be extracted regardless of admin page restrictions, and the supplied worker also grants that token deletion access. No private token is committed to the repository.

The same signed-in, verified Firebase admin account used by the project must make uploads. The server validates its Firebase ID token before calling the worker; sessionStorage flags cannot grant upload access. Existing Firebase content save methods are unchanged.

## Bucket CORS

The R2 bucket (not just the upload worker) needs CORS for the exact preview/published origins used by the admin:

```json
[
  {
    "AllowedOrigins": ["https://YOUR-PUBLISHED-ORIGIN", "https://YOUR-PREVIEW-ORIGIN"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["Content-Type", "Range"],
    "ExposeHeaders": ["ETag", "Content-Length", "Content-Range", "Accept-Ranges"],
    "MaxAgeSeconds": 3600
  }
]
```

Replace the origins with actual origins, without a trailing slash. Exposing `ETag` is required for multipart completion. Enable GET/HEAD and range support for direct video playback. The worker API is called server-to-server; its CORS does not authorize bucket PUTs.

## Resume behavior and limits

- Confirmed multipart ETags are saved to IndexedDB after each part; failed or interrupted parts retry with fresh signed URLs. Completed parts are not sent again.
- Switching data off pauses attempts until the connection returns. The current incomplete part restarts, not the whole file.
- Keep the page/browser open for automatic recovery. Browsers can suspend work when backgrounded or closed; this cannot be prevented on mobile.
- After closing/reloading the browser, return to the same form and reselect the original file. A sampled SHA-256 fingerprint, size and filename protect against selecting a different file.
- R2 lifecycle rules can expire incomplete multipart sessions. A removed/expired session cannot resume.
- The supplied worker has no multipart list/status or idempotency endpoint. A lost create response may orphan an incomplete session, and a lost successful complete response needs status reconciliation in the worker for guaranteed recovery. The website cannot promise uninterrupted uploads under every failure with this API.
- MP4 with H.264/AAC is the widest-compatible upload format. No transcoding is provided by this worker; MOV or other codecs depend on the viewer's browser.

## Playback protection

Direct video URLs use Mux Video Player inside the existing movie/episode/comedy subscription checks. Google Drive embeds and provider controls are unchanged. Right-click is blocked and the player offers no added download control.

The worker returns public R2 URLs. Public URLs are not DRM and can be accessed outside the site. Real content access protection requires a private bucket with entitlement-checked signed playback, or a Mux-hosted signed/DRM workflow; hiding developer tools or player controls cannot protect public media.

## Verification performed

- Unit tests: confirmed-part recovery, saved-session resume, offline reconnect, missing ETag rejection and admin identity policy.
- Browser: direct WebM playback with Mux on 390px mobile and 1280px desktop; no width overflow or runtime errors in the isolated player/field check; signed-out file selection rejected.
- Live worker health responds configured. Real upload, bucket CORS and Firebase save/read-back require the private token and an authenticated Firebase admin session; these remain unverified.
- The sandbox browser rejected the H.264 MP4 test source; actual H.264 playback remains to be tested on a supported device.