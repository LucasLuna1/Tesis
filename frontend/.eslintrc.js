module.exports = {
  extends: [
    'react-app',
    'react-app/jest'
  ],
  rules: {
    // Reglas básicas sin TypeScript específico
    'no-unused-vars': 'warn',
    'react-hooks/exhaustive-deps': 'warn'
  }
};
