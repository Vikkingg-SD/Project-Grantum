export function splitRegion(region: string): { region: string; category: string } {
  const parts = region.split(' · ');
  return {
    region: parts[0] ?? region,
    category: parts[1] ?? '',
  };
}
