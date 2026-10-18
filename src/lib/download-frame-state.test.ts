import { test } from "node:test";
import assert from "node:assert/strict";
import { isDownloadFrameBlank, type DownloadFrameDocument } from "./download-frame-state";

const page = (text: string, content = false): DownloadFrameDocument => ({
  readyState: "complete", URL: "https://example.com/confirmation",
  body: { textContent: text, querySelector: () => content ? {} : null },
});

test("Download Anyway is available for a completed blank embedded page", () => {
  assert.equal(isDownloadFrameBlank(page(" \n "), "/confirmation"), true);
});
test("normal provider text and visual controls do not show the fallback", () => {
  assert.equal(isDownloadFrameBlank(page("Download anyway"), "/confirmation"), false);
  assert.equal(isDownloadFrameBlank(page("", true), "/confirmation"), false);
});
test("loading and unreadable cross-origin pages are not assumed blank", () => {
  assert.equal(isDownloadFrameBlank(null, "/confirmation"), false);
  assert.equal(isDownloadFrameBlank({ ...page(""), readyState: "loading" }, "/confirmation"), false);
  assert.equal(isDownloadFrameBlank({ ...page(""), URL: "about:blank" }, "/confirmation"), false);
});