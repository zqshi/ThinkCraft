export const securityConfig = {
  jwtSecret: process.env.JWT_SECRET || '',
  tokenExpiry: '7d'
};
