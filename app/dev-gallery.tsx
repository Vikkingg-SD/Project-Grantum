import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';
import { ScreenContainer } from '@/components/templates/ScreenContainer';
import { EmptyStateLayout } from '@/components/templates/EmptyStateLayout';
import { AppText } from '@/components/atoms/AppText';
import { AppButton } from '@/components/atoms/AppButton';
import { AppInput } from '@/components/atoms/AppInput';
import { AppTextArea } from '@/components/atoms/AppTextArea';
import { StatusBadge } from '@/components/atoms/StatusBadge';
import { MetricGauge } from '@/components/atoms/MetricGauge';
import { ProgressBar } from '@/components/atoms/ProgressBar';
import { ToggleSwitch } from '@/components/atoms/ToggleSwitch';
import { Chip } from '@/components/atoms/Chip';
import { IconButton } from '@/components/atoms/IconButton';
import { Loader } from '@/components/atoms/Loader';
import { GrantCard } from '@/components/molecules/GrantCard';
import { ChatInputRow } from '@/components/molecules/ChatInputRow';
import { ChatMessageBubble } from '@/components/molecules/ChatMessageBubble';
import { AuditLogLine } from '@/components/molecules/AuditLogLine';
import { ConfidenceGaugeReadout } from '@/components/molecules/ConfidenceGaugeReadout';
import { HeroContinueCard } from '@/components/molecules/HeroContinueCard';
import { FilterFieldGroup } from '@/components/molecules/FilterFieldGroup';
import { PipelineFunnelBar } from '@/components/organisms/PipelineFunnelBar';
import { GrantDiscoveryGrid } from '@/components/organisms/GrantDiscoveryGrid';
import { GrantDetailModalSheet } from '@/components/organisms/GrantDetailModalSheet';
import { useTheme } from '@/hooks/useTheme';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useThemeStore } from '@/store/useThemeStore';
import { RADIUS, SPACING } from '@/config/theme';
import type { Grant } from '@/types/grant';
import type { ChatEntry } from '@/types/chat';

const GALLERY_GRANTS: Grant[] = [
  {
    id: 'gal-1',
    title: 'Climate Resilience Infrastructure',
    funder: 'Northstar Foundation',
    deadline: '28 days',
    amount: '$250k–$500k',
    matchPct: 94,
    region: 'Global · Infrastructure',
    summary: 'Fixture grant for kit inspection in both themes.',
  },
  {
    id: 'gal-2',
    title: 'Community Health Access',
    funder: 'Civic Futures Fund',
    deadline: '41 days',
    amount: '$75k–$150k',
    matchPct: 82,
    region: 'East Europe · Health',
    summary: 'Second fixture grant for grid and sheet inspection.',
  },
];

const GALLERY_FUNNEL = [
  { label: 'Discovery', count: 24 },
  { label: 'Pre-screen', count: 8 },
  { label: 'Draft', count: 3 },
  { label: 'Audit', count: 2 },
  { label: 'Ready', count: 1 },
  { label: 'Awarded', count: 1 },
];

const REGION_OPTIONS = ['Global', 'East Europe', 'CIS'];

export default function DevGalleryScreen() {
  const theme = useTheme();
  const breakpoint = useBreakpoint();
  const reduceMotion = useReduceMotion();
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const [inputValue, setInputValue] = useState('');
  const [areaValue, setAreaValue] = useState('');
  const [toggled, setToggled] = useState(false);
  const [chipSelected, setChipSelected] = useState(false);
  const [regions, setRegions] = useState<string[]>([]);
  const [chatValue, setChatValue] = useState('');
  const [messages, setMessages] = useState<ChatEntry[]>([
    {
      id: 'gal-welcome',
      text: 'Gallery chat fixture. Send a line to inspect the bubble.',
      variant: 'assistant-narrative',
      timestamp: 'now',
    },
  ]);
  const [lastAction, setLastAction] = useState('none');
  const [selectedGrant, setSelectedGrant] = useState<Grant | null>(null);

  if (!__DEV__) return null;

  const sendChat = () => {
    const text = chatValue.trim();
    if (!text) return;
    setMessages((prev) => [
      ...prev,
      { id: `gal-msg-${prev.length}`, text, variant: 'user', timestamp: 'now' },
    ]);
    setChatValue('');
  };

  return (
    <ScreenContainer>
      <AppText variant="display">Dev Gallery</AppText>
      <AppText variant="caption" color="muted" style={styles.meta}>
        {`breakpoint ${breakpoint} · reduceMotion ${String(reduceMotion)} · dev-only route`}
      </AppText>
      <View style={styles.row}>
        <AppButton label="Toggle theme" variant="outline" size="sm" onPress={toggleTheme} />
        <AppButton
          label="Open detail sheet"
          variant="surface"
          size="sm"
          onPress={() => setSelectedGrant(GALLERY_GRANTS[0])}
        />
      </View>
      <View style={styles.row}>
        <View
          style={[
            styles.swatch,
            { backgroundColor: theme.surfaceMuted, borderColor: theme.inputBorder },
          ]}
        />
        <AppText variant="caption" color="muted">
          surfaceMuted / inputBorder (ratified derived tokens)
        </AppText>
      </View>
      <AppText variant="h2" style={styles.section}>
        Atoms
      </AppText>
      <View style={styles.row}>
        <AppButton
          label="Primary"
          variant="primary"
          size="sm"
          onPress={() => setLastAction('primary')}
        />
        <AppButton
          label="Outline"
          variant="outline"
          size="sm"
          onPress={() => setLastAction('outline')}
        />
        <AppButton label="Ghost" variant="ghost" size="sm" onPress={() => setLastAction('ghost')} />
        <AppButton
          label="Danger"
          variant="danger"
          size="sm"
          onPress={() => setLastAction('danger')}
        />
      </View>
      <AppInput
        label="Sample input"
        value={inputValue}
        onChangeText={setInputValue}
        placeholder="Type to inspect"
      />
      <AppTextArea
        label="Sample area"
        charLimit={120}
        value={areaValue}
        onChangeText={setAreaValue}
      />
      <View style={styles.row}>
        <StatusBadge label="Verified" variant="verified" />
        <StatusBadge label="Pending" variant="pending" />
        <StatusBadge label="Failure" variant="failure" />
        <StatusBadge label="Gold" variant="gold" />
      </View>
      <View style={styles.row}>
        <MetricGauge value={85} tier="verified" />
        <ProgressBar percent={42} label="Drafting progress" />
      </View>
      <View style={styles.row}>
        <ToggleSwitch checked={toggled} onChange={setToggled} />
        <Chip label="Moat" selected={chipSelected} onToggle={() => setChipSelected((v) => !v)} />
        <IconButton
          icon={<Star size={18} color={theme.primary} />}
          label="Star"
          onPress={() => setLastAction('star')}
        />
      </View>
      <Loader label="Calibrating instrument…" />
      <AppText variant="h2" style={styles.section}>
        Molecules
      </AppText>
      {[39, 40, 84, 85, 100].map((score) => (
        <ConfidenceGaugeReadout key={score} score={score} />
      ))}
      <HeroContinueCard
        projectTitle={GALLERY_GRANTS[0].title}
        completionPct={42}
        onResume={() => setLastAction('resume')}
      />
      <HeroContinueCard completionPct={0} onResume={() => setLastAction('resume-untitled')} />
      <HeroContinueCard variant="no-session" onStartNew={() => setLastAction('start')} />
      <GrantCard
        grant={GALLERY_GRANTS[0]}
        onSelect={() => setLastAction('card-select')}
        onApply={() => setLastAction('card-apply')}
      />
      <GrantCard
        grant={{
          ...GALLERY_GRANTS[1],
          title:
            'Gallery stress fixture: a long application title that must wrap without hiding either action',
          region: 'Gallery stress fixture: a long region and category description that must wrap',
        }}
        onSelect={() => setLastAction('stress-select')}
        onApply={() => setLastAction('stress-apply')}
      />
      <FilterFieldGroup
        label="Regions"
        options={REGION_OPTIONS}
        selected={regions}
        onToggle={(opt) =>
          setRegions((prev) =>
            prev.includes(opt) ? prev.filter((r) => r !== opt) : [...prev, opt]
          )
        }
      />
      <AuditLogLine
        agent="agent-2-deterministic"
        message="Gallery pass armed"
        status="passed"
        timestamp="now"
      />
      {messages.map((m) => (
        <ChatMessageBubble key={m.id} {...m} />
      ))}
      <ChatInputRow
        value={chatValue}
        onChangeText={setChatValue}
        onSend={sendChat}
        placeholder="Send a gallery line…"
      />
      <AppText variant="h2" style={styles.section}>
        Organisms
      </AppText>
      <PipelineFunnelBar stages={GALLERY_FUNNEL} />
      <GrantDiscoveryGrid
        grants={GALLERY_GRANTS}
        onSelect={setSelectedGrant}
        onApply={(g) => setLastAction(`apply-${g.id}`)}
      />
      <AppText variant="h2" style={styles.section}>
        Templates
      </AppText>
      <EmptyStateLayout
        title="Gallery empty state"
        description="Demonstrates the empty-state layout in the current theme."
        ctaLabel="Acknowledge"
        onCtaPress={() => setLastAction('empty-cta')}
      />
      <AppText variant="caption" color="muted" style={styles.meta}>
        {`last action: ${lastAction}`}
      </AppText>
      <GrantDetailModalSheet
        grant={selectedGrant}
        visible={Boolean(selectedGrant)}
        onClose={() => setSelectedGrant(null)}
        onApply={(g) => {
          setLastAction(`sheet-apply-${g.id}`);
          setSelectedGrant(null);
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  meta: {
    marginTop: SPACING.xs,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  section: {
    marginTop: SPACING.xl,
    marginBottom: SPACING.sm,
  },
  swatch: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
});
