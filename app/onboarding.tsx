import { Redirect } from 'expo-router';
import { ENV } from '@/config/env';
import OnboardingScreen from '@/screens/OnboardingScreen';

export default function OnboardingEntry() {
  return ENV.DATA_SOURCE === 'api' ? <Redirect href="/connected" /> : <OnboardingScreen />;
}
