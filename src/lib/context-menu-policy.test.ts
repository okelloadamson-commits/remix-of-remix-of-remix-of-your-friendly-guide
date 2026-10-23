import test from "node:test";
import assert from "node:assert/strict";
import { allowAdminContextMenu } from "./context-menu-policy";

test("right-click is allowed throughout the admin dashboard", () => {
  for (const path of ["/admin/dashboard", "/admin/movies", "/admin/episodes", "/admin/plans", "/admin/settings"]) {
    assert.equal(allowAdminContextMenu(path), true);
  }
});

test("right-click remains restricted outside the admin dashboard", () => {
  for (const path of ["/", "/watch/movie", "/agent", "/admin", "/administrator", "/admin-movies"]) {
    assert.equal(allowAdminContextMenu(path), false);
  }
});