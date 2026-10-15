import { resolveApiBaseUrl } from '../src/config';

describe('resolveApiBaseUrl', () => {
  it('uses EXPO_PUBLIC_API_URL first', () => {
    expect(
      resolveApiBaseUrl({ EXPO_PUBLIC_API_URL: 'http://192.168.1.5:4000' }, '10.0.0.2:8081', 'ios'),
    ).toBe('http://192.168.1.5:4000');
  });

  it('uses the Metro host for a physical device in development', () => {
    expect(resolveApiBaseUrl({}, '192.168.1.20:8081', 'android')).toBe('http://192.168.1.20:4000');
  });

  it('uses the emulator and simulator defaults', () => {
    expect(resolveApiBaseUrl({}, undefined, 'android')).toBe('http://10.0.2.2:4000');
    expect(resolveApiBaseUrl({}, 'localhost:8081', 'ios')).toBe('http://localhost:4000');
  });
});
