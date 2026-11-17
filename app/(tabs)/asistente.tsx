// app/(tabs)/asistente.tsx
// Asistente con IA que conoce el resumen de tus fotos: responde en streaming (useChat + expo/fetch).
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useChat } from '@ai-sdk/react';
import type { UIMessage } from 'ai';
import { crearTransporteAsistente } from '@/lib/chatTransport';
import { useIsOnline } from '@/lib/queryClient';
import { usePhotos } from '@/hooks/usePhotos';

const SUGERENCIAS = [
  'Resume mis fotos de esta semana',
  '¿Dónde he tomado más fotos?',
  'Sugiere notas para mis fotos sin nota',
  '¿Qué tienen en común mis favoritas?',
  'Propón álbumes para organizar mis fotos',
];

function Burbuja({ mensaje }: { mensaje: UIMessage }) {
  const esUsuario = mensaje.role === 'user';
  const texto = mensaje.parts
    .map((p) => (p.type === 'text' ? p.text : ''))
    .join('')
    .trim();
  if (!texto) return null;
  return (
    <View className={`mb-2 max-w-[85%] rounded-2xl px-4 py-2.5 ${esUsuario ? 'self-end bg-emerald-500' : 'self-start bg-neutral-900'}`}>
      <Text className={esUsuario ? 'text-neutral-950' : 'leading-5 text-neutral-100'}>{texto}</Text>
    </View>
  );
}

export default function AsistenteScreen() {
  const transport = useMemo(() => crearTransporteAsistente(), []);
  const { messages, sendMessage, status, error, stop, clearError, regenerate, setMessages } = useChat({ transport });
  const isOnline = useIsOnline();
  const { photos } = usePhotos();
  const [texto, setTexto] = useState('');
  const lista = useRef<FlatList<UIMessage>>(null);

  const ocupado = status === 'submitted' || status === 'streaming';
  const puedeEnviar = !ocupado && isOnline && texto.trim().length > 0;

  const enviar = (pregunta: string) => {
    if (ocupado || !isOnline || !pregunta.trim()) return;
    clearError();
    sendMessage({ text: pregunta.trim() });
    setTexto('');
  };

  // Atajo desde Inicio: /asistente?q=... envía la pregunta una sola vez y limpia el parámetro
  const { q } = useLocalSearchParams<{ q?: string }>();
  useEffect(() => {
    if (!q) return;
    router.setParams({ q: undefined });
    if (ocupado || !isOnline) {
      setTexto(q);
      return;
    }
    clearError();
    sendMessage({ text: q });
    // Solo debe reaccionar a una pregunta nueva
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <SafeAreaView className="flex-1 bg-neutral-950" edges={['top']}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={60}>
        {/* Encabezado */}
        <View className="flex-row items-center justify-between border-b border-neutral-900 px-4 py-3">
          <View className="flex-row items-center gap-2">
            <Ionicons name="sparkles" size={20} color="#e879f9" />
            <View>
              <Text className="text-lg font-bold text-white">Asistente GeoCam</Text>
              <Text className="text-xs text-neutral-400">
                Conoce {photos.length === 1 ? '1 foto' : `${photos.length} fotos`} · notas, descripciones y lugares
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => setMessages([])}
            disabled={ocupado || messages.length === 0}
            className={`flex-row items-center gap-1 rounded-full px-3 py-1.5 ${messages.length ? 'bg-neutral-900' : 'opacity-30'}`}
            accessibilityLabel="Nueva conversación"
          >
            <Ionicons name="add" size={16} color="#d4d4d4" />
            <Text className="text-xs text-neutral-200">Nueva</Text>
          </Pressable>
        </View>

        {!isOnline && (
          <View className="flex-row items-center gap-2 bg-amber-500/15 px-4 py-2">
            <Ionicons name="cloud-offline-outline" size={16} color="#fbbf24" />
            <Text className="flex-1 text-xs text-amber-200">Sin conexión: el asistente necesita internet.</Text>
          </View>
        )}

        <FlatList
          ref={lista}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => <Burbuja mensaje={item} />}
          contentContainerClassName="flex-grow p-4"
          onContentSizeChange={() => lista.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View className="flex-1 justify-center gap-4">
              <View className="items-center gap-2">
                <View className="h-14 w-14 items-center justify-center rounded-2xl bg-fuchsia-500/15">
                  <Ionicons name="sparkles" size={28} color="#e879f9" />
                </View>
                <Text className="text-center text-base font-semibold text-white">¿En qué te ayudo con tus fotos?</Text>
                <Text className="text-center text-xs text-neutral-400">
                  Envío a Google Gemini las notas, descripciones, fechas y lugares de tus últimas 60 fotos. Nunca las imágenes.
                </Text>
              </View>
              <View className="gap-2">
                {SUGERENCIAS.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => enviar(s)}
                    disabled={!isOnline}
                    className={`flex-row items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 p-3 ${isOnline ? '' : 'opacity-40'}`}
                  >
                    <Ionicons name="chatbubble-ellipses-outline" size={16} color="#a3a3a3" />
                    <Text className="flex-1 text-neutral-200">{s}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          }
        />

        {status === 'submitted' && (
          <View className="flex-row items-center gap-2 px-4 pb-2">
            <ActivityIndicator color="#e879f9" />
            <Text className="text-xs text-neutral-400">Pensando…</Text>
          </View>
        )}

        {error && (
          <View className="mx-4 mb-2 gap-2 rounded-xl bg-red-500/10 p-3">
            <Text className="text-red-300">{error.message}</Text>
            <View className="flex-row gap-5">
              <Pressable onPress={() => regenerate()} disabled={!isOnline}>
                <Text className={`font-semibold text-red-300 ${isOnline ? '' : 'opacity-40'}`}>Reintentar</Text>
              </Pressable>
              <Pressable onPress={clearError}>
                <Text className="font-semibold text-red-300">Cerrar</Text>
              </Pressable>
            </View>
          </View>
        )}

        <View className="flex-row items-end gap-2 border-t border-neutral-900 p-3">
          <TextInput
            className="max-h-28 flex-1 rounded-2xl bg-neutral-900 px-4 py-3 text-white"
            placeholder={isOnline ? 'Pregunta sobre tus fotos…' : 'Sin conexión'}
            placeholderTextColor="#737373"
            value={texto}
            onChangeText={setTexto}
            multiline
            editable={!ocupado}
          />
          {ocupado ? (
            <Pressable onPress={stop} className="h-12 w-12 items-center justify-center rounded-full bg-neutral-200" accessibilityLabel="Detener">
              <Ionicons name="stop" size={18} color="#0a0a0a" />
            </Pressable>
          ) : (
            <Pressable
              onPress={() => enviar(texto)}
              disabled={!puedeEnviar}
              className={`h-12 w-12 items-center justify-center rounded-full ${puedeEnviar ? 'bg-emerald-500' : 'bg-neutral-800'}`}
              accessibilityLabel="Enviar"
            >
              <Ionicons name="arrow-up" size={20} color={puedeEnviar ? '#0a0a0a' : '#525252'} />
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
