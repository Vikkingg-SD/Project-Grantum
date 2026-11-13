import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DeviceStorage } from './devicePersistence';

export function getDeviceStorage(): DeviceStorage {
  return AsyncStorage;
}
