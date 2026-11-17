// app/login.tsx
// Entrar o crear cuenta. No navega a mano: al cambiar la sesión, Stack.Protected cambia de pantalla.
import { useState, type ComponentProps, type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';

type Modo = 'entrar' | 'crear';

function Campo({
  icon,
  right,
  ...props
}: ComponentProps<typeof TextInput> & {
  icon: ComponentProps<typeof Ionicons>['name'];
  right?: ReactNode;
}) {
  return (
    <View className="flex-row items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-3">
      <Ionicons name={icon} size={18} color="#737373" />
      <TextInput className="flex-1 py-3 text-base text-white" placeholderTextColor="#737373" {...props} />
      {right}
    </View>
  );
}

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const [modo, setModo] = useState<Modo>('entrar');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [verClave, setVerClave] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const cambiarModo = (m: Modo) => {
    setModo(m);
    setError(null);
    setAviso(null);
  };

  const submit = async () => {
    setError(null);
    setAviso(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Escribe un correo válido.');
    if (password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.');
    if (modo === 'crear' && password !== confirm) return setError('Las contraseñas no coinciden.');

    setBusy(true);
    try {
      if (modo === 'entrar') {
        setError(await signIn(email, password));
      } else {
        const res = await signUp(email, password);
        if (res.error) {
          setError(res.error);
        } else if (res.needsConfirmation) {
          setModo('entrar');
          setAviso('Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesión.');
        }
        // Si no pide confirmación, la sesión ya quedó abierta y la app entra sola
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView className="flex-1 bg-neutral-950" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerClassName="flex-grow justify-center gap-4 px-6 py-10" keyboardShouldPersistTaps="handled">
        <View className="items-center gap-2">
          <View className="h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500/15">
            <Ionicons name="camera" size={40} color="#10b981" />
          </View>
          <Text className="text-3xl font-bold text-white">GeoCam</Text>
          <Text className="text-center text-neutral-400">
            Fotos con ubicación, respaldadas en la nube y con un asistente de IA.
          </Text>
        </View>

        {/* Selector Entrar / Crear cuenta */}
        <View className="mt-2 flex-row rounded-xl bg-neutral-900 p-1">
          {(['entrar', 'crear'] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => cambiarModo(m)}
              className={`flex-1 items-center rounded-lg py-2 ${modo === m ? 'bg-emerald-500' : ''}`}
              accessibilityRole="tab"
              accessibilityState={{ selected: modo === m }}
            >
              <Text className={modo === m ? 'font-semibold text-neutral-950' : 'text-neutral-300'}>
                {m === 'entrar' ? 'Iniciar sesión' : 'Crear cuenta'}
              </Text>
            </Pressable>
          ))}
        </View>

        <Campo
          icon="mail-outline"
          placeholder="Correo"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <Campo
          icon="lock-closed-outline"
          placeholder="Contraseña (mínimo 6)"
          secureTextEntry={!verClave}
          autoCapitalize="none"
          value={password}
          onChangeText={setPassword}
          right={
            <Pressable onPress={() => setVerClave((v) => !v)} hitSlop={10} accessibilityLabel="Mostrar u ocultar contraseña">
              <Ionicons name={verClave ? 'eye-off-outline' : 'eye-outline'} size={20} color="#a3a3a3" />
            </Pressable>
          }
        />
        {modo === 'crear' && (
          <Campo
            icon="lock-closed-outline"
            placeholder="Repite la contraseña"
            secureTextEntry={!verClave}
            autoCapitalize="none"
            value={confirm}
            onChangeText={setConfirm}
          />
        )}

        {error && (
          <View className="flex-row items-center gap-2 rounded-xl bg-red-500/10 p-3">
            <Ionicons name="alert-circle-outline" size={18} color="#f87171" />
            <Text className="flex-1 text-red-300">{error}</Text>
          </View>
        )}
        {aviso && (
          <View className="flex-row items-center gap-2 rounded-xl bg-emerald-500/10 p-3">
            <Ionicons name="mail-unread-outline" size={18} color="#34d399" />
            <Text className="flex-1 text-emerald-200">{aviso}</Text>
          </View>
        )}

        <Pressable
          className={`flex-row items-center justify-center gap-2 rounded-xl bg-emerald-500 p-4 ${busy ? 'opacity-60' : ''}`}
          disabled={busy}
          onPress={submit}
          accessibilityRole="button"
        >
          {busy && <ActivityIndicator color="#0a0a0a" />}
          <Text className="text-base font-semibold text-neutral-950">
            {modo === 'entrar' ? 'Entrar' : 'Crear cuenta'}
          </Text>
        </Pressable>

        <Text className="text-center text-xs text-neutral-500">
          Tus fotos se guardan primero en el teléfono y funcionan sin conexión.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
