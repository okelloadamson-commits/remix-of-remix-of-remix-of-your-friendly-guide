// Tracks whether any media upload is running so dialogs stay open while it runs.
type Listener = (active: boolean) => void;

const fields = new Map<string, boolean>();
const listeners = new Set<Listener>();

function anyActive() {
  for (const active of fields.values()) if (active) return true;
  return false;
}

function notify() {
  const active = anyActive();
  for (const listener of Array.from(listeners)) {
    try { listener(active); } catch { /* a bad listener must not break others */ }
  }
}

export function setUploadActive(key: string, isActive: boolean) {
  if (fields.get(key) === isActive) return;
  if (isActive) fields.set(key, true);
  else fields.delete(key);
  notify();
}

export function isAnyUploadActive() {
  return anyActive();
}

export function subscribeUploadActivity(listener: Listener) {
  listeners.add(listener);
  listener(anyActive());
  return () => { listeners.delete(listener); };
}
