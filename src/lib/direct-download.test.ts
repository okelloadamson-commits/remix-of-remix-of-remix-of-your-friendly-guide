import test from "node:test";
import assert from "node:assert/strict";
import { getDirectDownloadUrl } from "./direct-download";
import { streamMediaDownload } from "./direct-download.server";

test("direct uploaded videos use an attachment URL, not a frame", () => {
  const path = getDirectDownloadUrl("https://pub-example.r2.dev/movie.webm", "Movie.webm");
  assert.equal(path, "/api/public/media-download?source=https%3A%2F%2Fpub-example.r2.dev%2Fmovie.webm&filename=Movie.webm");
});

test("Google Drive stays out of the direct download flow", () => {
  assert.equal(getDirectDownloadUrl("https://drive.google.com/file/d/abc/preview", "Movie.mp4"), null);
  assert.equal(getDirectDownloadUrl("https://drive.usercontent.google.com/download?id=abc", "Movie.mp4"), null);
});

test("download endpoint rejects private hosts and deceptive R2 URLs before fetching", async () => {
  for (const source of ["http://127.0.0.1/video.mp4", "https://pub-example.r2.dev.evil.com/video.mp4", "https://user:pass@pub-example.r2.dev/video.mp4"]) {
    let fetched = false;
    const response = await streamMediaDownload(new Request(`https://site.test/api/public/media-download?${new URLSearchParams({ source })}`), async () => {
      fetched = true;
      return new Response("wrong");
    });
    assert.equal(response.status, 400);
    assert.equal(fetched, false);
  }
});

test("R2 download streams attachment bytes and forwards resume ranges", async () => {
  const request = new Request("https://site.test/api/public/media-download?source=https%3A%2F%2Fpub-example.r2.dev%2Fmovie.webm&filename=Movie.webm", { headers: { Range: "bytes=3-" } });
  const response = await streamMediaDownload(request, async (_source, init) => {
    assert.equal(new Headers(init?.headers).get("Range"), "bytes=3-");
    assert.equal(init?.redirect, "error");
    return new Response("video", { status: 206, headers: { "Content-Range": "bytes 3-7/8" } });
  });
  assert.equal(response.status, 206);
  assert.match(response.headers.get("Content-Disposition") || "", /attachment;.*Movie.webm/);
  assert.equal(response.headers.get("Content-Range"), "bytes 3-7/8");
  assert.equal(await response.text(), "video");
});

test("download name preserves the movie title for both modern and older download managers", async () => {
  const filename = "Luo Ancient Movie.mp4";
  const response = await streamMediaDownload(new Request(`https://site.test/api/public/media-download?${new URLSearchParams({ source: "https://pub-example.r2.dev/random-upload-id.mp4", filename })}`), async () => new Response("video"));
  assert.equal(response.headers.get("Content-Disposition"), 'attachment; filename="Luo Ancient Movie.mp4"; filename*=UTF-8\'\'Luo%20Ancient%20Movie.mp4');
});

test("episode download name preserves season, episode and actual file extension", async () => {
  const filename = "Luo Story S02E03.webm";
  const response = await streamMediaDownload(new Request(`https://site.test/api/public/media-download?${new URLSearchParams({ source: "https://pub-example.r2.dev/random-id.webm", filename })}`), async () => new Response("video"));
  assert.equal(response.headers.get("Content-Disposition"), 'attachment; filename="Luo Story S02E03.webm"; filename*=UTF-8\'\'Luo%20Story%20S02E03.webm');
});