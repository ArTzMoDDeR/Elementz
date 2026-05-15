import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.eugenelabaleine.elementz',
  appName: 'Elementz',
  webDir: 'out',
  server: {
    url: 'https://elementz.fun',
    cleartext: false
  },
  android: {
    allowMixedContent: false
  }
};

export default config;