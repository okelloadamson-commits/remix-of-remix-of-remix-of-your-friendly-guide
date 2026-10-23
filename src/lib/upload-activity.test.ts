import { describe, expect, test } from "bun:test";
import { isAnyUploadActive, setUploadActive, subscribeUploadActivity } from "./upload-activity";

describe("upload-activity", () => {
  test("reports inactive when nothing is uploading", () => {
    expect(isAnyUploadActive()).toBe(false);
  });

  test("becomes active while an upload runs and inactive after it ends", () => {
    setUploadActive("field-a", true);
    expect(isAnyUploadActive()).toBe(true);
    setUploadActive("field-a", false);
    expect(isAnyUploadActive()).toBe(false);
  });

  test("stays active while any one of several uploads is running", () => {
    setUploadActive("poster", true);
    setUploadActive("video", true);
    setUploadActive("poster", false);
    expect(isAnyUploadActive()).toBe(true);
    setUploadActive("video", false);
    expect(isAnyUploadActive()).toBe(false);
  });

  test("notifies subscribers when activity starts and ends", () => {
    const seen: boolean[] = [];
    const stop = subscribeUploadActivity((active) => seen.push(active));
    setUploadActive("trailer", true);
    setUploadActive("trailer", false);
    stop();
    setUploadActive("trailer", true);
    setUploadActive("trailer", false);
    expect(seen).toEqual([false, true, false]);
  });
});
