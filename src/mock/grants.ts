import { Grant } from '@/types/grant';

export const mockGrants: Grant[] = [
  {
    id: '1',
    title: 'Climate Resilience Infrastructure',
    funder: 'Northstar Foundation',
    deadline: '28 days',
    amount: '$250k–$500k',
    matchPct: 94,
    region: 'Global · Infrastructure',
    summary:
      'Deploy flood-resilient infrastructure across 12 municipalities, pairing sensor networks with community response planning to protect climate-exposed districts.',
  },
  {
    id: '2',
    title: 'Community Health Access',
    funder: 'Civic Futures Fund',
    deadline: '41 days',
    amount: '$75k–$150k',
    matchPct: 82,
    region: 'East Europe · Health',
    summary:
      'Expand primary-care outreach to underserved communities through mobile clinics and telehealth kiosks, cutting preventable admissions and wait times.',
  },
  {
    id: '3',
    title: 'Open Data for Public Good',
    funder: 'The Meridian Trust',
    deadline: '56 days',
    amount: '$40k–$100k',
    matchPct: 76,
    region: 'CIS · Technology',
    summary:
      'Publish civic datasets through an open, machine-readable platform that powers public-interest research, transparency tools, and regional innovation.',
  },
];
