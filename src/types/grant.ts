export type GrantStage = 'Idea / Early' | 'Prototype / Pilot' | 'Scaling';
export type GrantParticipation = 'Solo' | 'Consortium' | 'Either';
export type GrantTeamSize = '1-3' | '4-10' | '11+';

export interface Grant {
  id: string;
  title: string;
  funder: string;
  deadline: string;
  amount: string;
  matchPct: number;
  region: string;
  summary: string;
  stage?: GrantStage;
  participation?: GrantParticipation;
  teamSize?: GrantTeamSize;
  eligibilityCriteria?: string[];
}

export interface GrantDetail extends Grant {
  requirements: string[];
}
