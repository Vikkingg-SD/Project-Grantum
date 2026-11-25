import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useActiveGrantId } from '@/hooks/useActiveGrantId';

export default function GrantIndexRoute() {
  const grantID = useActiveGrantId();
  const { attemptId } = useLocalSearchParams<{ attemptId?: string | string[] }>();
  return (
    <Redirect href={{ pathname: '/grants/[grantID]/dashboard', params: { grantID, attemptId } }} />
  );
}
