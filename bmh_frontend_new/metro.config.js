const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable CSS parsing in Metro
config.resolver.sourceExts.push('css');

// Completely mock react-native-maps on web to prevent codegenNativeCommands error
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'react-native-maps') {
    return {
      type: 'empty',
    };
  }
  // Optionally, you can also mock react-native-svg on web if it ever throws errors, but it usually shouldn't.
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;