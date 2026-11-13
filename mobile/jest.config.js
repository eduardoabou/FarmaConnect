module.exports = {
  preset: '@react-native/jest-preset',
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],
  moduleNameMapper: {
    '^react-native-ble-plx$': '<rootDir>/__mocks__/react-native-ble-plx.ts',
    '^@slastra/nblib$': '<rootDir>/__mocks__/nblib.ts',
  },
};
