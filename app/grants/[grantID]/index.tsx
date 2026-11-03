import React from 'react';
import { Redirect } from 'expo-router';
import { useActiveGrantId } from '@/hooks/useActiveGrantId';

export default function GrantIndexRoute() {
  const grantID = useActiveGrantId();
  return <Redirect href={{ pathname: '/grants/[grantID]/dashboard', params: { grantID } }} />;
}
