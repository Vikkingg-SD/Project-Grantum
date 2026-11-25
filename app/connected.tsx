import { Redirect } from 'expo-router';
import { ENV } from '@/config/env';
import { ConnectedWorkspace } from '@/connected/ConnectedWorkspace';

export default function ConnectedRoute() {
  return ENV.DATA_SOURCE === 'api' ? <ConnectedWorkspace /> : <Redirect href="/" />;
}
