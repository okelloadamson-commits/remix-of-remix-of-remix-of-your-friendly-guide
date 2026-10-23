import { it } from "node:test";
import { strict as assert } from "node:assert";
import { canUploadMedia, usesDirectVideoPlayer } from "./upload-policy";

it("only the verified admin can request uploads", () => {
  assert.equal(canUploadMedia({ email: "lightstarrecord@gmail.com", emailVerified: true }), true);
  assert.equal(canUploadMedia({ email: "viewer@example.com", emailVerified: true }), false);
  assert.equal(canUploadMedia({ email: "lightstarrecord@gmail.com", emailVerified: false }), false);
  assert.equal(canUploadMedia({ email: "lightstarrecord@gmail.com", emailVerified: true, disabled: true }), false);
  assert.equal(canUploadMedia(undefined), false);
});
it("direct R2 video uses Mux while Google Drive remains an embed", () => {
  assert.equal(usesDirectVideoPlayer("https://pub-example.r2.dev/movies/movie.mp4"), true);
  assert.equal(usesDirectVideoPlayer("https://media.example.com/movie.mp4"), true);
  assert.equal(usesDirectVideoPlayer("https://drive.google.com/file/d/abc/preview"), false);
  assert.equal(usesDirectVideoPlayer("https://drive.usercontent.google.com/download?id=abc"), false);
  assert.equal(usesDirectVideoPlayer("javascript:alert(1)"), false);
});