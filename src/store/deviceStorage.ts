import type { DeviceStorage } from './devicePersistence';

export function getDeviceStorage(): DeviceStorage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}
