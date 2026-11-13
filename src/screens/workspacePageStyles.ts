import { StyleSheet } from 'react-native';
import { SPACING } from '@/config/theme';

export const styles = StyleSheet.create({
  pageContent: { gap: SPACING.lg },
  columns: { gap: SPACING.xl },
  desktopColumns: { flexDirection: 'row', alignItems: 'flex-start' },
  sideColumn: { minWidth: 0, gap: SPACING.lg },
  desktopSidebar: { width: '34%', flexShrink: 0 },
  mainColumn: { flex: 1, minWidth: 0, gap: SPACING.lg },
  card: { padding: SPACING.md, borderTopWidth: 1, gap: SPACING.md },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SPACING.sm },
  rowBetween: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  checklistGrid: { gap: SPACING.sm },
  checkItem: { paddingVertical: SPACING.sm, borderBottomWidth: 1, gap: SPACING.xs },
  syncAlert: { padding: SPACING.sm, borderBottomWidth: 1, gap: SPACING.sm },
});
