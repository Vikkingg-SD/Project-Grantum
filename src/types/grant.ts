export interface Grant {
  id: string;
  title: string;
  funder: string;
  deadline: string;
  amount: string;
  matchPct: number;
  region: string;
  summary: string;
}

export interface GrantDetail extends Grant {
  requirements: string[];
}
