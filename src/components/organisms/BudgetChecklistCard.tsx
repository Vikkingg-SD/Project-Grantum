import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppButton } from '@/components/atoms/AppButton';
import { AppInput } from '@/components/atoms/AppInput';
import { AppText } from '@/components/atoms/AppText';
import { StatusBadge } from '@/components/atoms/StatusBadge';
import { RADIUS, SPACING } from '@/config/theme';
import { useTheme } from '@/hooks/useTheme';
import { hydrateBudget, useBudgetStore } from '@/store/useBudgetStore';
import { buildDefaultBudgetRecord, evaluateWorkSlotBudget, formatUsd } from '@/utils/budget';

export interface BudgetChecklistCardProps {
  slotKey: string;
  canEdit: boolean;
}

export function BudgetChecklistCard({ slotKey, canEdit }: BudgetChecklistCardProps) {
  const theme = useTheme();
  const records = useBudgetStore((state) => state.records);
  const hasSaved = useBudgetStore((state) => state.hasSaved);
  const status = useBudgetStore((state) => state.status);
  const addLineItem = useBudgetStore((state) => state.addLineItem);
  const removeLineItem = useBudgetStore((state) => state.removeLineItem);
  const saveCaps = useBudgetStore((state) => state.saveCaps);

  useEffect(() => {
    void hydrateBudget();
  }, []);

  const record = useMemo(
    () => records[slotKey] ?? buildDefaultBudgetRecord(slotKey),
    [records, slotKey]
  );
  const evaluation = useMemo(() => evaluateWorkSlotBudget(record), [record]);

  const [capEdits, setCapEdits] = useState<{
    slotKey: string;
    fundingCap?: string;
    overheadPctCap?: string;
    overheadAmount?: string;
  }>({ slotKey });
  const activeCaps = capEdits.slotKey === slotKey ? capEdits : { slotKey };
  const fundingCapInput = activeCaps.fundingCap ?? record.fundingCap;
  const overheadPctCapInput = activeCaps.overheadPctCap ?? record.overheadPctCap;
  const overheadAmountInput = activeCaps.overheadAmount ?? record.overheadAmount;

  const [newDescription, setNewDescription] = useState('');
  const [newQuantity, setNewQuantity] = useState('1');
  const [newUnitRate, setNewUnitRate] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.rowBetween}>
        <AppText variant="h3">Itemized Budget &amp; Deterministic Cap Check</AppText>
        <StatusBadge label={evaluation.statusLabel} variant={evaluation.statusVariant} />
      </View>
      <AppText variant="caption" color="muted">
        Does not verify regional market prices or funder approval - based on funder&apos;s terms.
      </AppText>
      {hasSaved && status === 'session-only' ? (
        <AppText variant="caption" color="muted">
          Storage unavailable; budget changes apply to the current session.
        </AppText>
      ) : null}

      <View style={styles.summaryRow}>
        <AppText variant="metric-sm">
          Direct subtotal: {formatUsd(evaluation.directSubtotal)}
        </AppText>
        <AppText variant="metric-sm">
          Overhead:{' '}
          {evaluation.overheadAmount === null ? 'Unresolved' : formatUsd(evaluation.overheadAmount)}
          {evaluation.overheadPctActual !== null ? ` (${evaluation.overheadPctActual}%)` : ''}
        </AppText>
        <AppText variant="metric-sm">Grand total: {formatUsd(evaluation.grandTotal)}</AppText>
      </View>

      {evaluation.capExceeded && evaluation.fundingCap !== null && (
        <AppText color="failureText" accessibilityRole="alert">
          Warning: Grand total ({formatUsd(evaluation.grandTotal)}) exceeds funding cap (
          {formatUsd(evaluation.fundingCap)}).
        </AppText>
      )}
      {evaluation.overheadExceeded && evaluation.overheadPctCap !== null && (
        <AppText color="failureText" accessibilityRole="alert">
          Warning: Overhead exceeds the {evaluation.overheadPctCap}% cap.
        </AppText>
      )}
      {evaluation.configIssues.map((issue) => (
        <AppText key={issue} color="failureText" accessibilityRole="alert">
          Unresolved setting: {issue}
        </AppText>
      ))}

      <View style={[styles.section, { borderTopColor: theme.border }]}>
        <AppInput
          label="Funding cap (USD)"
          value={fundingCapInput}
          editable={canEdit}
          onChangeText={(value) => setCapEdits({ ...activeCaps, fundingCap: value })}
          placeholder="250000"
        />
        <AppInput
          label="Max overhead (%)"
          value={overheadPctCapInput}
          editable={canEdit}
          onChangeText={(value) => setCapEdits({ ...activeCaps, overheadPctCap: value })}
          placeholder="15"
        />
        <AppInput
          label="Indirect / overhead amount (USD)"
          value={overheadAmountInput}
          editable={canEdit}
          onChangeText={(value) => setCapEdits({ ...activeCaps, overheadAmount: value })}
          placeholder="20000"
        />
        <AppButton
          size="sm"
          variant="outline"
          label="Save budget caps"
          disabled={!canEdit}
          onPress={() => {
            saveCaps(slotKey, {
              fundingCap: fundingCapInput,
              overheadPctCap: overheadPctCapInput,
              overheadAmount: overheadAmountInput,
            });
            setCapEdits({ slotKey });
            setError('');
            setNotice('Budget caps and overhead settings updated.');
          }}
        />
      </View>

      {evaluation.lines.length === 0 ? (
        <AppText color="muted">No budget line items added yet.</AppText>
      ) : (
        evaluation.lines.map((line) => (
          <View key={line.id} style={[styles.section, { borderTopColor: theme.border }]}>
            <View style={styles.rowBetween}>
              <AppText variant="body">{line.description}</AppText>
              {line.status === 'valid' && line.lineTotal !== null ? (
                <AppText variant="metric-sm" color="verified">
                  {formatUsd(line.lineTotal)}
                </AppText>
              ) : (
                <StatusBadge label="UNRESOLVED" variant="pending" />
              )}
            </View>
            {line.status === 'valid' && line.quantity !== null && line.unitRate !== null ? (
              <AppText variant="caption" color="muted">
                Qty {line.quantity} × {formatUsd(line.unitRate)}
              </AppText>
            ) : (
              <AppText variant="caption" color="failureText">
                Unresolved: {line.issue ?? 'Enter valid numeric quantity and unit rate'}
              </AppText>
            )}
            <AppButton
              size="sm"
              variant="ghost"
              label="Remove"
              accessibilityLabel={`Remove budget row: ${line.description || line.id}`}
              disabled={!canEdit}
              onPress={() => {
                removeLineItem(slotKey, line.id);
                setError('');
                setNotice(`Removed "${line.description}" from itemized budget.`);
              }}
            />
          </View>
        ))
      )}

      <View style={[styles.section, { borderTopColor: theme.border }]}>
        <AppText variant="label">Add line item</AppText>
        <AppInput
          label="Line item description"
          value={newDescription}
          editable={canEdit}
          onChangeText={setNewDescription}
          placeholder="Telemetry cloud gateway setup"
        />
        <AppInput
          label="Quantity"
          value={newQuantity}
          editable={canEdit}
          onChangeText={setNewQuantity}
          placeholder="1"
        />
        <AppInput
          label="Unit rate (USD)"
          value={newUnitRate}
          editable={canEdit}
          onChangeText={setNewUnitRate}
          placeholder="15000"
        />
        {error ? (
          <AppText color="failureText" accessibilityRole="alert">
            {error}
          </AppText>
        ) : null}
        {notice ? (
          <AppText accessibilityLiveRegion="polite" color="verified">
            {notice}
          </AppText>
        ) : null}
        <AppButton
          size="sm"
          variant="primary"
          label="Add budget line item"
          disabled={!canEdit}
          onPress={() => {
            try {
              addLineItem(slotKey, {
                description: newDescription,
                quantity: newQuantity,
                unitRate: newUnitRate,
              });
              setNewDescription('');
              setNewQuantity('1');
              setNewUnitRate('');
              setError('');
              setNotice('Added budget line item.');
            } catch (e) {
              setNotice('');
              setError(e instanceof Error ? e.message : 'Unable to add budget line item.');
            }
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    gap: SPACING.md,
  },
  rowBetween: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  section: {
    borderTopWidth: 1,
    paddingTop: SPACING.sm,
    gap: SPACING.xs,
  },
});
