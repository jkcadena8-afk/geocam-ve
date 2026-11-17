// app/(tabs)/geocam.tsx
// Cámara + GPS en vivo. Cada foto se guarda en SQLite (con o sin red) a través de usePhotos.
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { CameraView } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCamera } from '@/hooks/useCamera';
import { useGeoLocation } from '@/hooks/useGeoLocation';
import { usePhotos } from '@/hooks/usePhotos';
import { PermissionPrimer } from '@/components/PermissionPrimer';
import { SyncBadge } from '@/components/SyncBadge';
import type { Coords } from '@/types/geo';

interface Aviso {
  texto: string;
  conUbicacion: boolean;
}

export default function GeoCamScreen() {
  // Si la pestaña no está visible, se apagan cámara y GPS (ahorro de batería)
  const [isFocused, setIsFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => setIsFocused(false);
    }, [])
  );

  const cam = useCamera();
  const geo = useGeoLocation({ watch: isFocused });
  const { addPhoto, lastPhoto, photos } = usePhotos();

  // Aviso breve después de guardar ("Foto guardada · con ubicación")
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const avisoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (avisoTimer.current) clearTimeout(avisoTimer.current);
  }, []);
  const mostrarAviso = (a: Aviso) => {
    setAviso(a);
    if (avisoTimer.current) clearTimeout(avisoTimer.current);
    avisoTimer.current = setTimeout(() => setAviso(null), 2200);
  };

  if (cam.permissionState === 'checking') {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-neutral-950">
        <ActivityIndicator color="#10b981" />
        <Text className="text-neutral-400">Preparando la cámara…</Text>
      </View>
    );
  }

  if (cam.permissionState !== 'granted') {
    return (
      <PermissionPrimer
        icon="camera"
        title="GeoCam necesita tu cámara"
        description="La usamos solo para las fotos que tú decidas tomar. Cada foto guarda dónde la tomaste para verla luego en el mapa."
        state={cam.permissionState}
        onRequest={cam.requestPermission}
        onOpenSettings={cam.openSettings}
      />
    );
  }

  // Degradación elegante: sin permiso de ubicación, las coordenadas quedan en null
  const currentCoords = async (): Promise<Coords | null> =>
    geo.permission === 'granted' ? geo.coords ?? (await geo.getCurrent()) : null;

  const guardar = async (uri: string, source: 'camera' | 'gallery') => {
    const coords = await currentCoords();
    await addPhoto({ uri, coords, source });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    mostrarAviso({ texto: coords ? 'Foto guardada con ubicación' : 'Foto guardada sin ubicación', conUbicacion: !!coords });
  };

  const handleCapture = async () => {
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const photo = await cam.takePhoto();
      if (photo) await guardar(photo.uri, 'camera');
    } catch (e) {
      Alert.alert('No se pudo guardar la foto', e instanceof Error ? e.message : undefined);
    }
  };

  // Importar desde galería (el selector del sistema no pide permiso)
  const handlePickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
      if (!result.canceled) await guardar(result.assets[0].uri, 'gallery');
    } catch (e) {
      Alert.alert('No se pudo importar la foto', e instanceof Error ? e.message : undefined);
    }
  };

  // Estado del GPS en una sola etiqueta
  const gps = (() => {
    if (geo.permission === 'blocked') return { color: '#f87171', texto: 'Ubicación bloqueada · toca para abrir Ajustes', accion: geo.openSettings };
    if (geo.permission !== 'granted' && geo.permission !== 'checking')
      return { color: '#fbbf24', texto: 'Activa la ubicación para etiquetar tus fotos', accion: geo.requestPermission };
    if (geo.coords)
      return { color: '#34d399', texto: `GPS · ±${Math.round(geo.coords.accuracy ?? 0)} m`, accion: undefined };
    return { color: '#a3a3a3', texto: 'Buscando GPS…', accion: undefined };
  })();

  return (
    <View className="flex-1 bg-black">
      {/* CameraView sin hijos: los controles van como hermanos con posición absoluta */}
      <CameraView
        ref={cam.cameraRef}
        style={StyleSheet.absoluteFill}
        facing={cam.facing}
        active={isFocused}
        onCameraReady={cam.onCameraReady}
      />

      {/* Degradados para que los controles se lean sobre cualquier imagen */}
      <LinearGradient colors={['rgba(0,0,0,0.7)', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 170 }} />
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 260 }} />

      <SafeAreaView className="absolute left-0 right-0 top-0 gap-2 px-4" edges={['top']}>
        <View className="flex-row items-center justify-between pt-1">
          <View>
            <Text className="text-lg font-bold text-white">GeoCam</Text>
            <Text className="text-xs text-neutral-300">{photos.length === 1 ? '1 foto guardada' : `${photos.length} fotos guardadas`}</Text>
          </View>
          <SyncBadge />
        </View>

        <Pressable
          onPress={gps.accion}
          disabled={!gps.accion}
          className="flex-row items-center gap-2 self-start rounded-full bg-black/55 px-3 py-1.5"
          accessibilityRole={gps.accion ? 'button' : undefined}
        >
          <View className="h-2 w-2 rounded-full" style={{ backgroundColor: gps.color }} />
          <Text className="text-xs font-medium text-white">{gps.texto}</Text>
        </Pressable>
        {geo.coords && (
          <Text className="font-mono text-[11px] text-neutral-300">
            {geo.coords.latitude.toFixed(5)}, {geo.coords.longitude.toFixed(5)}
          </Text>
        )}
        {geo.error && (
          <View className="rounded-lg bg-red-500/80 px-3 py-2">
            <Text className="text-center text-xs text-white">{geo.error}</Text>
          </View>
        )}
      </SafeAreaView>

      {/* Aviso al guardar */}
      {aviso && (
        <View className="absolute left-0 right-0 items-center" style={{ bottom: 190 }} pointerEvents="none">
          <View className="flex-row items-center gap-2 rounded-full bg-neutral-900/95 px-4 py-2.5">
            <Ionicons name={aviso.conUbicacion ? 'location' : 'checkmark-circle'} size={16} color="#34d399" />
            <Text className="font-medium text-white">{aviso.texto}</Text>
          </View>
        </View>
      )}

      {/* Controles inferiores */}
      <View className="absolute bottom-8 left-0 right-0 gap-4 px-6">
        <Text className="text-center text-xs text-neutral-300">
          {cam.isCapturing ? 'Guardando…' : 'Toca el botón para capturar'}
        </Text>
        <View className="flex-row items-center justify-between">
          {/* Última foto */}
          <Pressable
            className="h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border-2 border-white/80 bg-white/10"
            disabled={!lastPhoto}
            onPress={() => lastPhoto && router.push({ pathname: '/foto/[id]', params: { id: String(lastPhoto.id) } })}
            accessibilityRole="button"
            accessibilityLabel="Ver última foto"
          >
            {lastPhoto ? (
              <Image source={{ uri: lastPhoto.uri }} className="h-full w-full" />
            ) : (
              <Ionicons name="image-outline" size={22} color="#d4d4d4" />
            )}
          </Pressable>

          {/* Disparador */}
          <Pressable
            onPress={handleCapture}
            disabled={cam.isCapturing}
            className="h-20 w-20 items-center justify-center rounded-full border-4 border-white active:opacity-70"
            accessibilityRole="button"
            accessibilityLabel="Tomar foto"
          >
            {cam.isCapturing ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <View className="h-16 w-16 rounded-full bg-white" />
            )}
          </Pressable>

          {/* Galería y cambiar cámara */}
          <View className="gap-3">
            <Pressable
              onPress={handlePickFromGallery}
              className="h-11 w-11 items-center justify-center rounded-full bg-black/50"
              accessibilityRole="button"
              accessibilityLabel="Importar desde galería"
            >
              <Ionicons name="images-outline" size={20} color="white" />
            </Pressable>
            <Pressable
              onPress={cam.toggleFacing}
              className="h-11 w-11 items-center justify-center rounded-full bg-black/50"
              accessibilityRole="button"
              accessibilityLabel="Cambiar cámara"
            >
              <Ionicons name="camera-reverse-outline" size={20} color="white" />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}
