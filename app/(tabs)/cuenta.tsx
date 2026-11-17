// app/(tabs)/cuenta.tsx
// Tu cuenta: quién inició sesión, resumen de tus fotos, estado de la nube y cerrar sesión.
import type { ComponentProps } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { usePhotos } from '@/hooks/usePhotos';
import { useSync } from '@/hooks/useSync';
import { SyncBadge } from '@/components/SyncBadge';

function Dato({ icon, valor, etiqueta }: { icon: ComponentProps<typeof Ionicons>['name']; valor: number; etiqueta: string }) {
  return (
    <View className="flex-1 items-center gap-1 rounded-xl bg-neutral-900 p-3">
      <Ionicons name={icon} size={18} color="#10b981" />
      <Text className="text-xl font-bold text-white">{valor}</Text>
      <Text className="text-center text-xs text-neutral-400">{etiqueta}</Text>
    </View>
  );
}

export default function CuentaScreen() {
  const { session, signOut } = useAuth();
  const { photos, photosWithLocation } = usePhotos();
  const sync = useSync();

  const email = session?.user.email ?? 'Sin correo';
  const descritas = photos.filter((p) => p.aiDescription).length;
  const favoritas = photos.filter((p) => p.favorite).length;

  const confirmarSalida = () => {
    const aviso =
      sync.pendingCount > 0
        ? `Tienes ${sync.pendingCount} cambios sin subir. Se subirán cuando vuelvas a entrar con esta cuenta.`
        : 'Tus fotos siguen guardadas en este teléfono.';
    Alert.alert('Cerrar sesión', aviso, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-950" edges={['top']}>
      <ScrollView contentContainerClassName="gap-5 p-4">
        <Text className="text-2xl font-bold text-white">Cuenta</Text>

        <View className="flex-row items-center gap-3 rounded-2xl bg-neutral-900 p-4">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-emerald-500">
            <Text className="text-lg font-bold text-neutral-950">{email.charAt(0).toUpperCase()}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-xs text-neutral-400">Sesión iniciada como</Text>
            <Text className="font-semibold text-white" numberOfLines={1}>
              {email}
            </Text>
          </View>
        </View>

        <View className="flex-row gap-2">
          <Dato icon="images-outline" valor={photos.length} etiqueta="Fotos" />
          <Dato icon="location-outline" valor={photosWithLocation.length} etiqueta="Con ubicación" />
          <Dato icon="star-outline" valor={favoritas} etiqueta="Favoritas" />
          <Dato icon="sparkles-outline" valor={descritas} etiqueta="Con IA" />
        </View>

        <View className="gap-2">
          <Text className="text-sm font-semibold text-neutral-200">Nube</Text>
          <SyncBadge />
          {sync.lastResult && (
            <Text className="text-xs text-neutral-500">
              Última sincronización: {new Date(sync.lastResult.finishedAt).toLocaleTimeString('es-CO')} · bajaron{' '}
              {sync.lastResult.pulled}, subieron {sync.lastResult.pushed}
            </Text>
          )}
          {sync.error && <Text className="text-xs text-red-400">{sync.error.message}</Text>}
        </View>

        <Pressable
          onPress={confirmarSalida}
          className="mt-4 flex-row items-center justify-center gap-2 rounded-xl border border-red-500/60 p-4"
          accessibilityRole="button"
        >
          <Ionicons name="log-out-outline" size={20} color="#f87171" />
          <Text className="font-semibold text-red-400">Cerrar sesión</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
