import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { AppButton } from '@/components/atoms/AppButton';
import { useEscapeDismiss } from '@/hooks/useEscapeDismiss';
import type { CoWorkRole } from '@/types/workspace';

const roles: CoWorkRole[] = ['owner', 'editor', 'reviewer', 'viewer'];
export function ProjectRolePicker({
  name,
  role,
  onChange,
  disabled,
}: {
  name: string;
  role: CoWorkRole;
  onChange: (role: CoWorkRole) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<View>(null);

  const dismissAndFocusTrigger = useCallback(() => {
    setOpen(false);
    if (Platform.OS === 'web') {
      (trigger.current as unknown as HTMLElement | null)
        ?.querySelector<HTMLElement>('button, [role="button"]')
        ?.focus();
    }
  }, []);

  useEscapeDismiss(open, dismissAndFocusTrigger);

  useEffect(() => {
    if (!open || Platform.OS !== 'web') return;
    const onPointerDown = (event: MouseEvent) => {
      const container = trigger.current as unknown as HTMLElement | null;
      if (container && event.target instanceof Node && !container.contains(event.target)) {
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', onPointerDown, true);
    return () => window.removeEventListener('mousedown', onPointerDown, true);
  }, [open]);

  return (
    <View ref={trigger}>
      <AppButton
        label={`Role for ${name}: ${role[0].toUpperCase() + role.slice(1)}`}
        expanded={open}
        disabled={disabled}
        onPress={() => setOpen(!open)}
        variant="outline"
      />
      {open && (
        <View>
          {roles.map((option) => (
            <AppButton
              key={option}
              label={option[0].toUpperCase() + option.slice(1)}
              selected={option === role}
              variant="ghost"
              onPress={() => {
                onChange(option);
                setOpen(false);
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
}
