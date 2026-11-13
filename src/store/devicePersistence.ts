export interface DeviceStorage {
  getItem: (key: string) => string | null | Promise<string | null>;
  setItem: (key: string, value: string) => void | Promise<void>;
}

export type PersistenceStatus = 'device-saved' | 'saving' | 'session-only';

// Shared by web and native. A failed read never authorizes overwriting its data.
export function createDevicePersistence<T>(
  key: string,
  storage: DeviceStorage | undefined,
  validate: (value: unknown) => value is T
) {
  let initial: T | undefined;
  let hydrated = true;
  let blocked = !storage;
  let status: PersistenceStatus = 'session-only';
  let pending: Promise<T | undefined> | undefined;
  let writes = Promise.resolve();
  let revision = 0;
  const decode = (raw: string | null) => {
    if (raw === null) return undefined;
    const value: unknown = JSON.parse(raw);
    if (!validate(value)) throw new Error('Invalid saved workspace');
    status = 'device-saved';
    return value;
  };
  try {
    const raw = storage?.getItem(key) ?? null;
    if (typeof raw === 'object' && raw !== null) {
      hydrated = false;
      pending = raw.then(decode).catch(() => {
        blocked = true;
        return undefined;
      });
    } else {
      initial = decode(raw);
    }
  } catch {
    blocked = true;
  }
  return {
    initial,
    get hydrated() {
      return hydrated;
    },
    get status() {
      return status;
    },
    async hydrate(apply: (value: T) => void) {
      if (hydrated) return;
      const value = await pending;
      if (!hydrated && value !== undefined) apply(value);
      hydrated = true;
    },
    save(value: T, onStatus: (next: PersistenceStatus) => void): PersistenceStatus {
      if (!hydrated) throw new Error('Workspace is still loading');
      if (blocked || !storage) return 'session-only';
      const serialized = JSON.stringify(value);
      const ticket = ++revision;
      status = 'saving';
      writes = writes
        .then(() => storage.setItem(key, serialized))
        .then(() => {
          if (ticket === revision) onStatus((status = 'device-saved'));
        })
        .catch(() => {
          if (ticket === revision) onStatus((status = 'session-only'));
        });
      return status;
    },
    flush: () => writes,
  };
}
