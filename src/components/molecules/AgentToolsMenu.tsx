import React from 'react';
import { Pressable, ScrollView, StyleSheet, View, Platform, type ViewStyle } from 'react-native';
import Database from 'lucide-react-native/icons/database';
import ImageIcon from 'lucide-react-native/icons/image';
import Video from 'lucide-react-native/icons/video';
import Music from 'lucide-react-native/icons/music';
import LayoutTemplate from 'lucide-react-native/icons/layout-template';
import Telescope from 'lucide-react-native/icons/telescope';
import Scale from 'lucide-react-native/icons/scale';
import { AppButton } from '@/components/atoms/AppButton';
import { AppText } from '@/components/atoms/AppText';
import { ModalSheetLayout } from '@/components/templates/ModalSheetLayout';
import { LAYOUT } from '@/config/layout';
import { DRAFTING_COPY } from '@/config/copy';
import { RADIUS, SPACING, withAlpha } from '@/config/theme';
import { useLayoutMetrics } from '@/hooks/useLayoutMetrics';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useTheme } from '@/hooks/useTheme';

type Tone = 'primary' | 'verified' | 'pending' | 'gold';
type IconComponent = React.ComponentType<{ size?: number; color?: string }>;

export interface AgentToolDefinition {
  readonly id: string;
  readonly label: string;
  readonly subtitle: string;
  readonly icon: IconComponent;
  readonly tone: Tone;
}

export const AGENT_TOOLS: readonly AgentToolDefinition[] = [
  {
    id: 'search-database',
    label: 'Search Database',
    subtitle: 'Query grant records',
    icon: Database,
    tone: 'primary',
  },
  {
    id: 'create-image',
    label: 'Create image',
    subtitle: 'Pitch visuals & diagrams',
    icon: ImageIcon,
    tone: 'pending',
  },
  {
    id: 'create-video',
    label: 'Create video',
    subtitle: 'Project explainer clips',
    icon: Video,
    tone: 'gold',
  },
  {
    id: 'create-music',
    label: 'Create music',
    subtitle: 'Audio & intro cues',
    icon: Music,
    tone: 'verified',
  },
  {
    id: 'canvas',
    label: 'Canvas',
    subtitle: 'Structured long-form editor',
    icon: LayoutTemplate,
    tone: 'primary',
  },
  {
    id: 'deep-research',
    label: 'Deep research (Grant writing)',
    subtitle: 'Multi-source grant brief',
    icon: Telescope,
    tone: 'pending',
  },
  {
    id: 'guided-legal',
    label: 'Guided legal docs',
    subtitle: 'Compliance & grant terms',
    icon: Scale,
    tone: 'gold',
  },
] as const;

export function AgentToolsMenu({
  visible,
  onClose,
  selectedToolId,
  onSelectTool,
  onSelectPrompt,
  requiredSections,
}: {
  visible: boolean;
  onClose: () => void;
  selectedToolId?: string | null;
  onSelectTool: (tool: AgentToolDefinition | null) => void;
  onSelectPrompt: (prompt: string) => void;
  requiredSections: readonly string[];
}) {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const { width } = useLayoutMetrics();
  const columns = width < 480 ? 1 : 2;

  const rows: (AgentToolDefinition | null)[][] = [];
  for (let i = 0; i < AGENT_TOOLS.length; i += columns) {
    const row: (AgentToolDefinition | null)[] = AGENT_TOOLS.slice(i, i + columns);
    while (columns > 1 && row.length < columns) row.push(null);
    rows.push(row);
  }

  return (
    <ModalSheetLayout visible={visible} onClose={onClose} accessibilityLabel="Tools and prompts">
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <AppText variant="h2">Tools</AppText>
        <View style={styles.grid} testID="agent-tools-grid">
          {rows.map((row, rowIndex) => (
            <View key={rowIndex} style={columns > 1 ? styles.row : styles.singleColumnRow}>
              {row.map((tool, cellIndex) => (
                <View
                  key={tool ? tool.id : `spacer-${cellIndex}`}
                  style={columns > 1 ? styles.cell : styles.singleCell}
                >
                  {tool ? (
                    <ToolHeroCard
                      tool={tool}
                      compact={columns === 1}
                      selected={selectedToolId === tool.id}
                      reduceMotion={reduceMotion}
                      theme={theme}
                      onPress={() => {
                        onSelectTool(selectedToolId === tool.id ? null : tool);
                        onClose();
                      }}
                    />
                  ) : null}
                </View>
              ))}
            </View>
          ))}
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <AppText variant="h3">Convenience prompts</AppText>
        <AppText variant="caption" color="muted">
          Populate the agent composer with a starter instruction.
        </AppText>
        <View style={columns > 1 ? styles.promptsWrap : styles.prompts}>
          {DRAFTING_COPY.chips.map((chip) => (
            <AppButton
              key={chip}
              size="sm"
              label={chip}
              variant="outline"
              onPress={() => {
                onSelectPrompt(chip);
                onClose();
              }}
            />
          ))}
          {columns > 1 &&
            requiredSections.slice(0, 1).map((section) => {
              const prompt = `Draft response for: ${section}`;
              return (
                <AppButton
                  key={prompt}
                  size="sm"
                  label={prompt}
                  variant="ghost"
                  onPress={() => {
                    onSelectPrompt(prompt);
                    onClose();
                  }}
                />
              );
            })}
        </View>
      </ScrollView>
    </ModalSheetLayout>
  );
}

function ToolHeroCard({
  tool,
  compact,
  selected,
  reduceMotion,
  theme,
  onPress,
}: {
  tool: AgentToolDefinition;
  compact: boolean;
  selected: boolean;
  reduceMotion: boolean;
  theme: ReturnType<typeof useTheme>;
  onPress: () => void;
}) {
  const Icon = tool.icon;
  const color = theme[tool.tone];
  return (
    <Pressable
      testID={`tool-card-${tool.id}`}
      accessibilityRole="button"
      accessibilityLabel={tool.label}
      accessibilityState={{ selected }}
      aria-pressed={Platform.OS === 'web' ? selected : undefined}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        Platform.OS === 'web' && !reduceMotion && webFeedback,
        {
          backgroundColor: selected
            ? withAlpha(color, 0.14)
            : pressed
              ? theme.subtle
              : theme.surfaceMuted,
          borderColor: selected ? theme.primary : theme.border,
        },
      ]}
    >
      <View style={[styles.iconPlate, { backgroundColor: withAlpha(color, 0.16) }]}>
        <Icon size={18} color={color} />
      </View>
      <View style={styles.cardCopy}>
        <AppText variant={compact ? 'caption' : 'label'} color="main">
          {tool.label}
        </AppText>
        <AppText variant="caption" color="muted">
          {tool.subtitle}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    paddingTop: SPACING.xs,
    gap: SPACING.sm,
  },
  grid: { width: '100%', gap: SPACING.xs },
  row: { flexDirection: 'row', gap: SPACING.sm },
  singleColumnRow: { width: '100%' },
  cell: { flex: 1, flexBasis: 0, minWidth: 0 },
  singleCell: { width: '100%', minWidth: 0 },
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: Math.max(LAYOUT.minTouchTarget, 50),
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    gap: SPACING.sm,
  },
  iconPlate: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardCopy: { flex: 1, minWidth: 0, gap: 1 },
  divider: { height: 1, width: '100%', marginVertical: 2 },
  prompts: { gap: SPACING.xs },
  promptsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
});

const webFeedback = {
  transitionProperty: 'background-color, opacity',
  transitionDuration: '120ms',
  transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)',
} as ViewStyle;
