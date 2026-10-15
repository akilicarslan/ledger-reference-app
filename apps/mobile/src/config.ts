import Constants from 'expo-constants';
import { Platform } from 'react-native';

export const API_PORT = 4000;

/**
 * Finds the base URL of the Ledger API.
 *
 * 1. EXPO_PUBLIC_API_URL, when it is set (for example a LAN address).
 * 2. In development: the host of the Metro server. A physical device reaches
 *    the computer through this address.
 * 3. The emulator/simulator default: Android maps the computer to 10.0.2.2,
 *    the iOS simulator shares "localhost" with the computer.
 */
export function resolveApiBaseUrl(
  env: { EXPO_PUBLIC_API_URL?: string } = { EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL },
  hostUri: string | undefined = Constants.expoConfig?.hostUri,
  os: string = Platform.OS,
): string {
  if (env.EXPO_PUBLIC_API_URL) return env.EXPO_PUBLIC_API_URL;
  const metroHost = hostUri?.split(':')[0];
  if (metroHost && metroHost !== 'localhost' && metroHost !== '127.0.0.1') {
    return `http://${metroHost}:${API_PORT}`;
  }
  return os === 'android' ? `http://10.0.2.2:${API_PORT}` : `http://localhost:${API_PORT}`;
}
