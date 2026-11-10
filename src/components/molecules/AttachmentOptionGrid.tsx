import React from 'react';
import { Pressable, View, StyleSheet, Platform, type ViewStyle } from 'react-native';
import FileText from 'lucide-react-native/icons/file-text';
import FileSpreadsheet from 'lucide-react-native/icons/file-spreadsheet';
import Images from 'lucide-react-native/icons/images';
import { AppText } from '../atoms/AppText';
import { useTheme } from '@/hooks/useTheme';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { LAYOUT } from '@/config/layout';
import { RADIUS, SPACING, withAlpha } from '@/config/theme';
import { ATTACHMENT_ACCEPT } from '@/utils/attachments';

export type AttachmentCategory = keyof typeof ATTACHMENT_ACCEPT;
type Tone = 'primary' | 'verified' | 'pending' | 'gold';
type IconComponent = React.ComponentType<{ size?: number; color?: string }>;

/** Registry of picker options. Add a category here and the grid places it automatically. */
const OPTIONS: Record<AttachmentCategory, { label: string; icon: IconComponent; tone: Tone }> = {
  Document: { label: 'Document', icon: FileText, tone: 'primary' },
  Spreadsheet: { label: 'Spreadsheet', icon: FileSpreadsheet, tone: 'verified' },
  Media: { label: 'Photos & videos', icon: Images, tone: 'pending' },
};

/** Fixed two-column grid; odd counts are padded so every tile keeps the same width and column. */
const COLUMNS = 2;
const ICON_SIZE = 28;

export function AttachmentOptionGrid({
  onChoose,
  disabled = false,
}: {
  onChoose: (category: AttachmentCategory) => void;
  disabled?: boolean;
}) {
  const categories = Object.keys(ATTACHMENT_ACCEPT) as AttachmentCategory[];
  const rows: (AttachmentCategory | null)[][] = [];
  for (let i = 0; i < categories.length; i += COLUMNS) {
    const row: (AttachmentCategory | null)[] = categories.slice(i, i + COLUMNS);
    while (row.length < COLUMNS) row.push(null);
    rows.push(row);
  }
  return (
    <View style={styles.grid}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((category, index) => (
            <View key={category ?? `empty-${index}`} style={styles.cell}>
              {category ? (
                <AttachmentOption
                  category={category}
                  disabled={disabled}
                  onPress={() => onChoose(category)}
                />
              ) : null}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function AttachmentOption({
  category,
  disabled,
  onPress,
}: {
  category: AttachmentCategory;
  disabled: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const { label, icon: Icon, tone } = OPTIONS[category];
  const color = theme[tone];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Choose ${label.toLowerCase()}`}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        Platform.OS === 'web' && !reduceMotion && webFeedback,
        { backgroundColor: pressed ? theme.subtle : 'transparent' },
        disabled && styles.disabled,
      ]}
    >
      <View
        style={[
          styles.iconPlate,
          { backgroundColor: withAlpha(color, 0.12), borderColor: withAlpha(color, 0.4) },
        ]}
      >
        <Icon size={ICON_SIZE} color={color} />
      </View>
      <AppText variant="caption" color="main" align="center" numberOfLines={2}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grid: { width: '100%', gap: SPACING.sm },
  row: { flexDirection: 'row', gap: SPACING.sm },
  cell: { flex: 1, flexBasis: 0, minWidth: 0 },
  tile: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: SPACING.sm,
    minHeight: LAYOUT.minTouchTarget,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  iconPlate: {
    width: ICON_SIZE * 2,
    height: ICON_SIZE * 2,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.4 },
});

const webFeedback = {
  transitionProperty: 'background-color',
  transitionDuration: '120ms',
  transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)',
} as ViewStyle;
