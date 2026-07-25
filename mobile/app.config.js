const appJson = require('./app.json');

module.exports = {
  ...appJson,
  expo: {
    ...appJson.expo,
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon.png',
          resizeMode: 'contain',
          backgroundColor: '#ffffff',
        },
      ],
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission:
            'Allow Explorience to track your location to record exploration while you explore.',
          isIosBackgroundLocationEnabled: true,
          isAndroidBackgroundLocationEnabled: true,
          isAndroidForegroundServiceEnabled: true,
          androidForegroundServiceIcon: './assets/images/fg-service-icon.png',
        },
      ],
      'expo-notifications',
      [
        'expo-camera',
        {
          cameraPermission:
            'Allow Explorience to use your camera to verify discovered locations.',
        },
      ],
      '@rnmapbox/maps',
    ],
  },
};