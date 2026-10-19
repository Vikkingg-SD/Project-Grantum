import { ENV } from '@/config/env';
import { mockDataSource } from '@/mock/mockDataSource';
import type { DataSource } from '@/types/api';

let dataSource: DataSource | null = null;

export function getDataSource(): DataSource {
  if (!dataSource) {
    if (ENV.DATA_SOURCE === 'mock') {
      dataSource = mockDataSource;
    } else {
      throw new Error(
        'HTTP data source not implemented. Set EXPO_PUBLIC_DATA_SOURCE=mock or wait for WP-G.'
      );
    }
  }
  return dataSource;
}
