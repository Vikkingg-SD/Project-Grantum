import { draftConfidenceScore, scoreTier } from '../src/utils/scoring';
import { TIERS } from '../src/config/constants';

const six = ['Mission', 'Pain', 'Solution', 'Market', 'Competitors', 'Moat'];

const cases: [string, number, number][] = [
  ['6/6', draftConfidenceScore(six, six), 100],
  ['5/6 (export locks)', draftConfidenceScore(six.slice(0, 5), six), 83],
  ['4/6', draftConfidenceScore(six.slice(0, 4), six), 67],
  ['0/6', draftConfidenceScore([], six), 0],
  ['6/7 (re-unlocks)', draftConfidenceScore(six, [...six, 'Marketing strategy']), 86],
  ['empty required', draftConfidenceScore([], []), 100],
  ['duplicates count once', draftConfidenceScore(['Mission', 'Mission'], six), 17],
  ['unrelated ignored', draftConfidenceScore(['Zzz'], six), 0],
  ['confidence 85 -> verified', scoreTier(85, TIERS.confidence) === 'verified' ? 1 : 0, 1],
  ['confidence 84 -> pending', scoreTier(84, TIERS.confidence) === 'pending' ? 1 : 0, 1],
  ['confidence 40 -> pending', scoreTier(40, TIERS.confidence) === 'pending' ? 1 : 0, 1],
  ['confidence 39 -> failure', scoreTier(39, TIERS.confidence) === 'failure' ? 1 : 0, 1],
  ['match 80 -> verified', scoreTier(80, TIERS.match) === 'verified' ? 1 : 0, 1],
  ['match 79 -> pending', scoreTier(79, TIERS.match) === 'pending' ? 1 : 0, 1],
];

let failed = 0;
for (const [name, got, want] of cases) {
  const ok = got === want;
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name} got=${got} want=${want}`);
}

if (failed > 0) process.exit(1);
console.log(`ALL ${cases.length} SCORING CASES PASS`);
