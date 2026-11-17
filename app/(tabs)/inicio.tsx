// app/(tabs)/inicio.tsx
// Pantalla de bienvenida: qué es GeoCam, tus números, tus fotos recientes y atajos al asistente.
import type { ComponentProps } from 'react';
import { FlatList, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { usePhotos } from '@/hooks/usePhotos';
import { SyncBadge } from '@/components/SyncBadge';

const PREGUNTAS = ['Resume mis fotos de esta semana', '¿Dónde he tomado más fotos?', 'Sugiere notas para mis fotos sin nota'];

const PASOS: { icon: ComponentProps<typeof Ionicons>['name']; titulo: string; texto: string }[] = [
  { icon: 'camera', titulo: 'Toma una foto', texto: 'GeoCam guarda dónde la tomaste, aunque no tengas internet.' },
  { icon: 'cloud-upload', titulo: 'Se respalda sola', texto: 'Cuando vuelve la red se sube a tu cuenta y llega a tus otros teléfonos.' },
  { icon: 'sparkles', titulo: 'La IA te ayuda', texto: 'Describe tus fotos y responde preguntas sobre tus recuerdos.' },
];

function saludo() {
  const h = new Date().getHours();
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
}

function Dato({ icon, valor, etiqueta, color }: { icon: ComponentProps<typeof Ionicons>['name']; valor: number; etiqueta: string; color: string }) {
  return (
    <View className="flex-1 gap-2 rounded-2xl border border-neutral-800 bg-neutral-900/80 p-3">
      <View className="h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}22` }}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text className="text-2xl font-bold text-white">{valor}</Text>
      <Text className="text-xs text-neutral-400">{etiqueta}</Text>
    </View>
  );
}

export default function InicioScreen() {
  const { session } = useAuth();
  const { photos, photosWithLocation } = usePhotos();

  const email = session?.user.email ?? '';
  const nombre = email.split('@')[0] || 'explorador';
  const nombreBonito = nombre.charAt(0).toUpperCase() + nombre.slice(1);

  // "Lugares": fotos agrupadas por coordenadas redondeadas (~100 m)
  const lugares = new Set(photosWithLocation.map((p) => `${p.latitude!.toFixed(3)},${p.longitude!.toFixed(3)}`)).size;
  const favoritas = photos.filter((p) => p.favorite).length;
  const conIA = photos.filter((p) => p.aiDescription).length;
  const recientes = photos.slice(0, 12);

  return (
    <SafeAreaView className="flex-1 bg-neutral-950" edges={['top']}>
      <ScrollView contentContainerClassName="gap-6 px-4 pb-10 pt-2" showsVerticalScrollIndicator={false}>
        {/* Saludo + cuenta */}
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-sm text-neutral-400">{saludo()}</Text>
            <Text className="text-2xl font-bold text-white" numberOfLines={1}>
              {nombreBonito} 👋
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/cuenta')}
            className="h-11 w-11 items-center justify-center rounded-full bg-emerald-500"
            accessibilityRole="button"
            accessibilityLabel="Abrir mi cuenta"
          >
            <Text className="text-lg font-bold text-neutral-950">{nombreBonito.charAt(0)}</Text>
          </Pressable>
        </View>

        {/* Llamado principal */}
        <LinearGradient colors={['#10b981', '#0891b2']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 24, padding: 20, gap: 12 }}>
          <View className="flex-row items-center gap-2">
            <Ionicons name="location" size={18} color="#ecfeff" />
            <Text className="text-xs font-semibold uppercase tracking-widest text-cyan-50">GeoCam</Text>
          </View>
          <Text className="text-2xl font-bold text-white">Cada foto recuerda dónde la tomaste</Text>
          <Text className="text-cyan-50">Se guarda en tu teléfono, se respalda en la nube y la IA te ayuda a entenderla.</Text>
          <Pressable
            onPress={() => router.navigate('/geocam')}
            className="mt-1 flex-row items-center justify-center gap-2 self-start rounded-full bg-white px-5 py-3"
            accessibilityRole="button"
          >
            <Ionicons name="camera" size={18} color="#047857" />
            <Text className="font-semibold text-emerald-800">Abrir cámara</Text>
          </Pressable>
        </LinearGradient>

        {/* Números */}
        <View className="gap-2">
          <View className="flex-row gap-2">
            <Dato icon="images" valor={photos.length} etiqueta="Fotos" color="#10b981" />
            <Dato icon="location" valor={lugares} etiqueta="Lugares" color="#38bdf8" />
          </View>
          <View className="flex-row gap-2">
            <Dato icon="star" valor={favoritas} etiqueta="Favoritas" color="#facc15" />
            <Dato icon="sparkles" valor={conIA} etiqueta="Descritas con IA" color="#e879f9" />
          </View>
          <SyncBadge />
        </View>

        {/* Recientes o cómo empezar */}
        {recientes.length > 0 ? (
          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-bold text-white">Recientes</Text>
              <Pressable onPress={() => router.navigate('/fotos')} hitSlop={8}>
                <Text className="font-semibold text-emerald-400">Ver todas</Text>
              </Pressable>
            </View>
            <FlatList
              horizontal
              data={recientes}
              keyExtractor={(p) => String(p.id)}
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-3"
              renderItem={({ item }) => (
                <Pressable onPress={() => router.push({ pathname: '/foto/[id]', params: { id: String(item.id) } })} className="w-32">
                  <Image source={{ uri: item.uri }} className="h-40 w-32 rounded-2xl bg-neutral-900" />
                  {item.favorite && (
                    <View className="absolute right-2 top-2 rounded-full bg-black/50 p-1">
                      <Ionicons name="star" size={12} color="#facc15" />
                    </View>
                  )}
                  <Text numberOfLines={1} className="mt-1.5 text-xs text-neutral-300">
                    {item.note || (item.aiDescription ? `✨ ${item.aiDescription}` : item.createdAt.toLocaleDateString('es-CO'))}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        ) : (
          <View className="gap-3">
            <Text className="text-lg font-bold text-white">Cómo funciona</Text>
            {PASOS.map((p, i) => (
              <View key={p.titulo} className="flex-row items-center gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/80 p-4">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15">
                  <Ionicons name={p.icon} size={20} color="#10b981" />
                </View>
                <View className="flex-1">
                  <Text className="font-semibold text-white">
                    {i + 1}. {p.titulo}
                  </Text>
                  <Text className="text-xs text-neutral-400">{p.texto}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Asistente */}
        <LinearGradient colors={['#2e1065', '#581c87']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 24, padding: 18, gap: 10 }}>
          <View className="flex-row items-center gap-2">
            <Ionicons name="sparkles" size={18} color="#f0abfc" />
            <Text className="text-lg font-bold text-white">Tu asistente IA</Text>
          </View>
          <Text className="text-sm text-fuchsia-100">Conoce tus notas, descripciones y lugares. Pregúntale lo que quieras:</Text>
          {PREGUNTAS.map((q) => (
            <Pressable
              key={q}
              onPress={() => router.push({ pathname: '/asistente', params: { q } })}
              className="flex-row items-center gap-2 rounded-xl bg-white/10 px-3 py-2.5"
            >
              <Ionicons name="chatbubble-ellipses-outline" size={15} color="#f5d0fe" />
              <Text className="flex-1 text-sm text-white">{q}</Text>
              <Ionicons name="arrow-forward" size={15} color="#f5d0fe" />
            </Pressable>
          ))}
        </LinearGradient>
      </ScrollView>
    </SafeAreaView>
  );
}
