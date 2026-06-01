module.exports = {
  root: true,
  extends: [
    '@react-native',
    'prettier',
  ],
  plugins: ['prettier'],
  parser: '@babel/eslint-parser',
  parserOptions: {
    requireConfigFile: false,
    babelOptions: {
      presets: ['babel-preset-expo'],
    },
  },
  rules: {
    'prettier/prettier': 'warn',
    'no-unused-vars': 'warn',
    'no-console': 'off',
    'react/react-in-jsx-scope': 'off',
  },
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
};
