// components/PermissionPrimer.tsx
// Pantalla previa de explicación (permission priming) reutilizable para cualquier permiso.
import type { ComponentProps } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PermissionState } from '@/types/geo';

interface Props {
  title: string;
  description: string;
  state: PermissionState;
  onRequest: () => void;
  onOpenSettings: () => void;
  icon?: ComponentProps<typeof Ionicons>['name'];
}

export function PermissionPrimer({ title, description, state, onRequest, onOpenSettings, icon = 'lock-open' }: Props) {
  const isBlocked = state === 'blocked';

  return (
    <View className="flex-1 items-center justify-center gap-5 bg-neutral-950 px-8">
      <View className="h-24 w-24 items-center justify-center rounded-3xl bg-emerald-500/15">
        <Ionicons name={icon} size={44} color="#10b981" />
      </View>
      <Text className="text-center text-2xl font-bold text-white">{title}</Text>
      <Text className="text-center text-base leading-6 text-neutral-300">
        {isBlocked
          ? 'Desactivaste este permiso. Puedes habilitarlo desde los Ajustes del sistema y volver aquí.'
          : description}
      </Text>
      <Pressable
        onPress={isBlocked ? onOpenSettings : onRequest}
        className="flex-row items-center gap-2 rounded-full bg-emerald-500 px-6 py-3.5 active:opacity-80"
        accessibilityRole="button"
      >
        <Ionicons name={isBlocked ? 'settings-outline' : 'checkmark-circle-outline'} size={18} color="#0a0a0a" />
        <Text className="font-semibold text-neutral-950">{isBlocked ? 'Abrir Ajustes' : 'Permitir acceso'}</Text>
      </Pressable>
      <Text className="text-center text-xs text-neutral-500">Puedes cambiarlo cuando quieras desde los Ajustes.</Text>
    </View>
  );
}
