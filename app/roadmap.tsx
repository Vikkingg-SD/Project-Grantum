import React from 'react';
import { Redirect } from 'expo-router';

// The interactive product roadmap now lives directly on the Dashboard.
export default function RoadmapRedirectRoute() {
  return <Redirect href="/dashboard" />;
}
