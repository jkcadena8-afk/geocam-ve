// app/+not-found.tsx
// Se muestra si se abre una ruta que no existe (por ejemplo, un enlace viejo).
import { Pressable, Text, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function NoEncontrada() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 items-center justify-center gap-4 bg-neutral-950 px-8">
        <View className="h-20 w-20 items-center justify-center rounded-3xl bg-amber-500/15">
          <Ionicons name="compass-outline" size={40} color="#fbbf24" />
        </View>
        <Text className="text-center text-2xl font-bold text-white">Esta pantalla no existe</Text>
        <Text className="text-center text-neutral-400">
          Llegaste a una dirección que GeoCam no conoce, por ejemplo un enlace antiguo. Tus fotos están bien.
        </Text>
        <Pressable
          onPress={() => router.replace('/')}
          className="flex-row items-center gap-2 rounded-full bg-emerald-500 px-6 py-3.5"
          accessibilityRole="button"
        >
          <Ionicons name="home" size={18} color="#0a0a0a" />
          <Text className="font-semibold text-neutral-950">Ir al inicio</Text>
        </Pressable>
      </View>
    </>
  );
}
