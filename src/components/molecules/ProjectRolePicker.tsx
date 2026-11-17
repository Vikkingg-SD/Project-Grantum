import React, { useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { AppButton } from '@/components/atoms/AppButton';
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
  useEffect(() => {
    if (!open || Platform.OS !== 'web') return;
    const dismiss = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      (trigger.current as unknown as HTMLElement | null)
        ?.querySelector<HTMLElement>('button, [role="button"]')
        ?.focus();
    };
    window.addEventListener('keydown', dismiss, true);
    return () => window.removeEventListener('keydown', dismiss, true);
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
