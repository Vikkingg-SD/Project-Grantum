import { createDevicePersistence } from '../src/store/devicePersistence';
import {
  addBudgetLineItem,
  buildDefaultBudgetRecord,
  evaluateWorkSlotBudget,
  isBudgetRecordMap,
  removeBudgetLineItem,
  updateBudgetCaps,
  type WorkSlotBudgetRecord,
} from '../src/utils/budget';

const check = (name: string, condition: boolean) => {
  if (!condition) throw new Error(`FAIL: ${name}`);
  console.info(`PASS ${name}`);
};

async function main() {
  const base = buildDefaultBudgetRecord('slot:project-1:1');
  const starterEval = evaluateWorkSlotBudget(base);
  check(
    'Given starter itemized budget When evaluated Then deterministic subtotal, overhead, and cap check pass',
    starterEval.directSubtotal === 220000 &&
      starterEval.overheadAmount === 20000 &&
      starterEval.grandTotal === 240000 &&
      !starterEval.capExceeded &&
      !starterEval.overheadExceeded &&
      starterEval.unresolvedCount === 0 &&
      starterEval.statusLabel === 'Within cap · $240,000 / $250,000'
  );

  const overCap = addBudgetLineItem(base, {
    description: 'Emergency acoustic reserve',
    quantity: '2',
    unitRate: '15000',
  });
  const overCapEval = evaluateWorkSlotBudget(overCap);
  check(
    'Given line items exceeding funding cap When evaluated Then capExceeded and grandTotal reflect exact arithmetic',
    overCapEval.directSubtotal === 250000 &&
      overCapEval.grandTotal === 270000 &&
      overCapEval.capExceeded &&
      overCapEval.statusLabel === 'Funding cap exceeded'
  );

  const highOverhead = updateBudgetCaps(base, {
    fundingCap: '300000',
    overheadPctCap: '15',
    overheadAmount: '45000',
  });
  const highOhEval = evaluateWorkSlotBudget(highOverhead);
  check(
    'Given overhead exceeding percentage cap When evaluated Then overheadExceeded flags deterministically',
    highOhEval.overheadExceeded &&
      highOhEval.statusLabel === 'Overhead cap exceeded' &&
      !highOhEval.capExceeded
  );

  const unresolved = addBudgetLineItem(base, {
    description: 'Pending lab quote',
    quantity: '2',
    unitRate: 'tbd',
  });
  const badConfig = updateBudgetCaps(unresolved, {
    fundingCap: '250000',
    overheadPctCap: '15',
    overheadAmount: 'abc',
  });
  const unresolvedEval = evaluateWorkSlotBudget(badConfig);
  check(
    'Given non-numeric unit rate and overhead When evaluated Then fields remain unresolved instead of zero',
    unresolvedEval.unresolvedCount === 2 &&
      unresolvedEval.overheadAmount === null &&
      unresolvedEval.lines.some((line) => line.status === 'unresolved' && line.lineTotal === null)
  );

  const trimmed = removeBudgetLineItem(overCap, overCap.items[2].id);
  check(
    'Given added line item When removed Then remaining item count matches starter record',
    trimmed.items.length === 2
  );

  const backing = new Map<string, string>();
  const storage = {
    getItem: (key: string) => backing.get(key) ?? null,
    setItem: (key: string, value: string) => {
      backing.set(key, value);
    },
  };
  const persistence = createDevicePersistence<Record<string, WorkSlotBudgetRecord>>(
    'grantum.budget.v1',
    storage,
    isBudgetRecordMap
  );
  const savedStatus = persistence.save({ [overCap.slotKey]: overCap }, () => {});
  await persistence.flush();
  const reloaded = createDevicePersistence<Record<string, WorkSlotBudgetRecord>>(
    'grantum.budget.v1',
    storage,
    isBudgetRecordMap
  );
  check(
    'Given saved itemized budget When reloaded from device storage Then all items and caps persist cleanly',
    savedStatus === 'saving' &&
      reloaded.initial?.[overCap.slotKey]?.items.length === 3 &&
      evaluateWorkSlotBudget(reloaded.initial[overCap.slotKey]).grandTotal === 270000
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
