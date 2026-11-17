// Polyfills que el AI SDK necesita en Hermes (Android/iOS).
// Se importa PRIMERO en app/_layout.tsx, antes que cualquier otra cosa.
// SDK 58 (RN 0.88) ya no expone en los tipos 'react-native/Libraries/...', así que en lugar de
// polyfillGlobal se definen los globales directamente, de forma síncrona.
import { Platform } from 'react-native';
import structuredClone from '@ungap/structured-clone';
import { TextDecoderStream, TextEncoderStream } from '@stardazed/streams-text-encoding';

function definirGlobal(nombre: string, valor: unknown) {
  Object.defineProperty(globalThis, nombre, { value: valor, configurable: true, writable: true });
}

if (Platform.OS !== 'web') {
  if (!('structuredClone' in globalThis)) definirGlobal('structuredClone', structuredClone);
  definirGlobal('TextEncoderStream', TextEncoderStream);
  definirGlobal('TextDecoderStream', TextDecoderStream);
}

export {};
