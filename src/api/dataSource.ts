import { ENV } from '@/config/env';
import { mockDataSource } from '@/mock/mockDataSource';
import type { DataSource } from '@/types/api';
import { httpDataSource } from './httpDataSource';

let dataSource: DataSource | null = null;

export function getDataSource(): DataSource {
  if (!dataSource) {
    if (ENV.DATA_SOURCE === 'mock') {
      dataSource = mockDataSource;
    } else {
      dataSource = httpDataSource;
    }
  }
  return dataSource;
}
