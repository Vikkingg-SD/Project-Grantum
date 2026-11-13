import { createDevicePersistence, type DeviceStorage } from '../src/store/devicePersistence';

const assert = {
  equal(actual: unknown, expected: unknown) {
    if (actual !== expected) throw new Error(`Expected ${String(expected)}, got ${String(actual)}`);
  },
  notEqual(actual: unknown, expected: unknown) {
    if (actual === expected) throw new Error('Values unexpectedly equal');
  },
  fail(message = 'Unexpected operation'): never {
    throw new Error(message);
  },
  throws(action: () => unknown) {
    try {
      action();
    } catch {
      return;
    }
    throw new Error('Expected operation to throw');
  },
};

type Saved = { text: string };
const valid = (data: unknown): data is Saved =>
  Boolean(data && typeof (data as Saved).text === 'string');

async function main() {
  for (const key of ['grantum.workspace.v1', 'grantum.workbench.v1']) {
    const values = new Map([[key, JSON.stringify({ text: 'Laptop draft' })]]);
    let release!: (value: string | null) => void;
    const storage: DeviceStorage = {
      getItem: () => new Promise((resolve) => (release = resolve)),
      setItem: async (name, value) => {
        values.set(name, value);
      },
    };
    const store = createDevicePersistence(key, storage, valid);
    assert.equal(store.hydrated, false);
    assert.throws(() => store.save({ text: 'Premature default' }, () => {}));
    let restored: Saved | undefined;
    const hydration = store.hydrate((value) => (restored = value));
    release(values.get(key)!);
    await hydration;
    assert.equal(restored?.text, 'Laptop draft');
    assert.equal(store.hydrated, true);
    store.save({ text: 'Edit one' }, () => {});
    let status = '';
    assert.equal(
      store.save({ text: 'Latest edit' }, (value) => (status = value)),
      'saving'
    );
    assert.notEqual(status, 'device-saved');
    await store.flush();
    assert.equal(status, 'device-saved');
    const restart = createDevicePersistence(
      key,
      {
        ...storage,
        getItem: async (name) => values.get(name) ?? null,
      },
      valid
    );
    await restart.hydrate((value) => (restored = value));
    assert.equal(restored?.text, 'Latest edit');
  }
  console.log(
    'PASS Given async device storage When loading, editing and restarting Then both namespaces retain the newest edit and block premature writes'
  );

  for (const raw of ['invalid JSON', JSON.stringify({ unexpected: true })]) {
    let writes = 0;
    const store = createDevicePersistence(
      'saved',
      {
        getItem: async () => raw,
        setItem: async () => {
          writes++;
        },
      },
      valid
    );
    await store.hydrate(() => assert.fail('Corrupt data must not be applied'));
    assert.equal(
      store.save({ text: 'Replacement' }, () => {}),
      'session-only'
    );
    await store.flush();
    assert.equal(writes, 0);
  }
  const readFailure = createDevicePersistence(
    'saved',
    {
      getItem: async () => {
        throw new Error('Unavailable');
      },
      setItem: () => assert.fail('Failed reads must not overwrite saved data'),
    },
    valid
  );
  await readFailure.hydrate(() => assert.fail());
  assert.equal(readFailure.hydrated, true);
  assert.equal(
    readFailure.save({ text: 'Edit' }, () => {}),
    'session-only'
  );
  console.log(
    'PASS Given corrupt or unavailable storage When hydration finishes Then startup completes without overwriting existing data'
  );

  let fail = true;
  let saved = '';
  const store = createDevicePersistence(
    'saved',
    {
      getItem: () => null,
      setItem: async (_, value) => {
        if (fail) throw new Error('Quota exceeded');
        saved = value;
      },
    },
    valid
  );
  let status = '';
  store.save({ text: 'First' }, (value) => (status = value));
  await store.flush();
  assert.equal(status, 'session-only');
  fail = false;
  store.save({ text: 'Recovered' }, (value) => (status = value));
  await store.flush();
  assert.equal(status, 'device-saved');
  assert.equal(JSON.parse(saved).text, 'Recovered');
  console.log(
    'PASS Given a failed write When storage recovers Then status reflects actual completion and the queue remains usable'
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
