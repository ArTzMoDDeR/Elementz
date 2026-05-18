import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.eugenelabaleine.elementz',
  appName: 'Elementz',
  webDir: 'out',
  server: {
    url: 'https://elementz.fun',
    cleartext: false,
    allowNavigation: [
      'elementz.fun',
      '*.elementz.fun',
      'accounts.google.com',
      '*.google.com',
      '*.googleapis.com',
      'appleid.apple.com',
      '*.apple.com'
    ]
  },
  ios: {
    allowsLinkPreview: false,
    scrollEnabled: false,
    limitsNavigationsToAppBoundDomains: false
  },
  android: {
    allowMixedContent: false
  }
};

export default config;