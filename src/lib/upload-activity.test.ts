import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { isAnyUploadActive, setUploadActive, subscribeUploadActivity } from "./upload-activity";

describe("upload-activity", () => {
  it("reports inactive when nothing is uploading", () => {
    assert.equal(isAnyUploadActive(), false);
  });

  it("becomes active while an upload runs and inactive after it ends", () => {
    setUploadActive("field-a", true);
    assert.equal(isAnyUploadActive(), true);
    setUploadActive("field-a", false);
    assert.equal(isAnyUploadActive(), false);
  });

  it("stays active while any one of several uploads is running", () => {
    setUploadActive("poster", true);
    setUploadActive("video", true);
    setUploadActive("poster", false);
    assert.equal(isAnyUploadActive(), true);
    setUploadActive("video", false);
    assert.equal(isAnyUploadActive(), false);
  });

  it("notifies subscribers when activity starts and ends", () => {
    const seen: boolean[] = [];
    const stop = subscribeUploadActivity((active) => seen.push(active));
    setUploadActive("trailer", true);
    setUploadActive("trailer", false);
    stop();
    setUploadActive("trailer", true);
    setUploadActive("trailer", false);
    assert.deepEqual(seen, [false, true, false]);
  });
});
