import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import ChevronUp from 'lucide-react-native/icons/chevron-up';
import { AppButton } from '@/components/atoms/AppButton';
import { AppInput } from '@/components/atoms/AppInput';
import { AppText } from '@/components/atoms/AppText';
import { RADIUS, SPACING } from '@/config/theme';
import { useEscapeDismiss } from '@/hooks/useEscapeDismiss';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useTheme } from '@/hooks/useTheme';
import { formatProfileRegions, parseProfileRegions } from '@/utils/workspace';

export interface ProjectSelectHandle {
  focus: () => void;
}

export interface ProjectSelectDropdownProps {
  label: string;
  mode: 'single' | 'multi';
  options: readonly string[];
  value: string;
  onChange: (nextValue: string) => void;
  disabled?: boolean;
  placeholder: string;
  searchPlaceholder?: string;
  allowCustom?: boolean;
  testID?: string;
  triggerRef?: React.Ref<ProjectSelectHandle>;
}

export function ProjectSelectDropdown({
  label,
  mode,
  options,
  value,
  onChange,
  disabled = false,
  placeholder,
  searchPlaceholder,
  allowCustom = false,
  testID,
  triggerRef,
}: ProjectSelectDropdownProps) {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const [open, setOpen] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [customDraft, setCustomDraft] = useState('');
  const [customOpen, setCustomOpen] = useState(false);
  const containerRef = useRef<View>(null);

  const focusTrigger = useCallback(() => {
    if (Platform.OS !== 'web') return;
    const node = containerRef.current as unknown as HTMLElement | null;
    if (!node) return;
    if (typeof node.scrollIntoView === 'function') {
      node.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    }
    node.querySelector<HTMLElement>('button, [role="button"]')?.focus();
  }, [reduceMotion]);

  useImperativeHandle(
    triggerRef,
    () => ({
      focus: focusTrigger,
    }),
    [focusTrigger]
  );

  const dismissAndFocusTrigger = useCallback(() => {
    setOpen(false);
    setFilterText('');
    setCustomOpen(false);
    focusTrigger();
  }, [focusTrigger]);

  useEscapeDismiss(open, dismissAndFocusTrigger);

  useEffect(() => {
    if (!open || Platform.OS !== 'web') return;
    const onPointerDown = (event: MouseEvent) => {
      const container = containerRef.current as unknown as HTMLElement | null;
      if (container && event.target instanceof Node && !container.contains(event.target)) {
        setOpen(false);
        setFilterText('');
        setCustomOpen(false);
      }
    };
    window.addEventListener('mousedown', onPointerDown, true);
    return () => window.removeEventListener('mousedown', onPointerDown, true);
  }, [open]);

  const selectedList = useMemo(
    () => (mode === 'multi' ? parseProfileRegions(value) : value.trim() ? [value.trim()] : []),
    [mode, value]
  );

  const allOptions = useMemo(() => {
    const merged = [...options];
    for (const selectedItem of selectedList) {
      if (!merged.some((opt) => opt.toLowerCase() === selectedItem.toLowerCase())) {
        merged.push(selectedItem);
      }
    }
    return merged;
  }, [options, selectedList]);

  const filteredOptions = useMemo(() => {
    const term = filterText.trim().toLowerCase();
    if (!term) return allOptions;
    return allOptions.filter((option) => option.toLowerCase().includes(term));
  }, [allOptions, filterText]);

  const triggerDisplay = selectedList.length > 0 ? selectedList.join(', ') : placeholder;
  const triggerLabel = `${label}: ${triggerDisplay}`;

  const toggleMultiOption = (option: string) => {
    const exists = selectedList.some((item) => item.toLowerCase() === option.toLowerCase());
    const nextList = exists
      ? selectedList.filter((item) => item.toLowerCase() !== option.toLowerCase())
      : [...selectedList, option];
    onChange(formatProfileRegions(nextList));
  };

  return (
    <View ref={containerRef} testID={testID} style={styles.container}>
      <AppText variant="caption" color="muted">
        {label}
      </AppText>
      <AppButton
        label={triggerLabel}
        variant="outline"
        expanded={open}
        disabled={disabled}
        iconPosition="right"
        icon={
          open ? (
            <ChevronUp size={18} color={theme.textMain} />
          ) : (
            <ChevronDown size={18} color={theme.textMain} />
          )
        }
        style={styles.triggerButton}
        onPress={() => {
          if (disabled) return;
          setOpen((current) => {
            if (current) {
              setFilterText('');
              setCustomOpen(false);
            }
            return !current;
          });
        }}
      />

      {mode === 'multi' && selectedList.length > 0 ? (
        <View style={styles.chipsRow}>
          {selectedList.map((region) => (
            <AppButton
              key={region}
              size="sm"
              variant="outline"
              selected
              disabled={disabled}
              label={`${region} ×`}
              accessibilityLabel={`${region} ×. Remove ${label.toLowerCase()}`}
              onPress={() => {
                if (disabled) return;
                toggleMultiOption(region);
              }}
            />
          ))}
        </View>
      ) : null}

      {open ? (
        <View
          testID={testID ? `${testID}-menu` : undefined}
          style={[
            styles.menu,
            {
              backgroundColor: theme.subtle,
              borderTopColor: theme.border,
              borderBottomColor: theme.border,
            },
          ]}
        >
          {mode === 'multi' ? (
            <AppInput
              accessibilityLabel={`Filter ${label.toLowerCase()}`}
              placeholder={searchPlaceholder ?? `Filter ${label.toLowerCase()}...`}
              value={filterText}
              onChangeText={setFilterText}
            />
          ) : null}
          <View style={styles.optionsList}>
            {filteredOptions.length === 0 ? (
              <AppText variant="caption" color="muted">
                No matching options.
              </AppText>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = selectedList.some(
                  (item) => item.toLowerCase() === option.toLowerCase()
                );
                return (
                  <AppButton
                    key={option}
                    size="sm"
                    variant="ghost"
                    selected={isSelected}
                    label={isSelected ? `✓ ${option}` : option}
                    style={styles.optionButton}
                    onPress={() => {
                      if (mode === 'multi') {
                        toggleMultiOption(option);
                      } else {
                        onChange(option);
                        setCustomOpen(false);
                        setOpen(false);
                      }
                    }}
                  />
                );
              })
            )}
            {allowCustom && mode === 'single' ? (
              <AppButton
                size="sm"
                variant="ghost"
                expanded={customOpen}
                label="Other (specify)"
                style={styles.optionButton}
                onPress={() => {
                  setCustomDraft(value && !options.includes(value) ? value : '');
                  setCustomOpen((prev) => !prev);
                }}
              />
            ) : null}
          </View>
          {allowCustom && mode === 'single' && customOpen ? (
            <View style={styles.customRow}>
              <AppInput
                label={`Custom ${label.toLowerCase()}`}
                placeholder={`Enter ${label.toLowerCase()}...`}
                value={customDraft}
                onChangeText={setCustomDraft}
              />
              <AppButton
                size="sm"
                variant="primary"
                label={`Use ${label.toLowerCase()}`}
                disabled={!customDraft.trim()}
                onPress={() => {
                  onChange(customDraft.trim());
                  setCustomOpen(false);
                  setOpen(false);
                }}
              />
            </View>
          ) : null}
          {mode === 'multi' ? (
            <View style={styles.menuFooter}>
              <AppButton
                size="sm"
                variant="outline"
                label="Done"
                accessibilityLabel={`Done selecting ${label.toLowerCase()}`}
                onPress={() => {
                  setFilterText('');
                  setOpen(false);
                }}
              />
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: SPACING.xs,
    marginVertical: 4,
  },
  triggerButton: {
    justifyContent: 'space-between',
    width: '100%',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  menu: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    gap: SPACING.xs,
  },
  optionsList: {
    gap: SPACING.xs,
  },
  optionButton: {
    justifyContent: 'flex-start',
    width: '100%',
  },
  customRow: {
    gap: SPACING.xs,
  },
  menuFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: SPACING.xs,
  },
});
