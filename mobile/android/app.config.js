const config = require('./app.json');

// Disable expo-updates in development to prevent emulator/device crashes on startup.
// EAS Build runs with NODE_ENV=production, so updates stay enabled for production/preview builds.
const isProduction = process.env.NODE_ENV === 'production';

module.exports = {
  ...config,
  expo: {
    ...config.expo,
    plugins: [
      ...(Array.isArray(config.expo.plugins) ? config.expo.plugins : []),
      'expo-build-properties',
      './plugins/withGradleMemory',
    ].filter(Boolean),
    updates: {
      ...config.expo.updates,
      enabled: isProduction,
      checkAutomatically: isProduction ? 'ON_LOAD' : 'NEVER',
    },
    // Fix duplicate RECORD_AUDIO permission; INTERNET is required for Firebase
    android: {
      ...config.expo.android,
      permissions: [
        'android.permission.INTERNET',
        'android.permission.RECORD_AUDIO',
      ],
    },
  },
};
