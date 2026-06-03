export const UserRole = {
  RESTAURANT: 'RESTAURANT',
  MARKET_AGENT: 'MARKET_AGENT',
  HUB_STAFF: 'HUB_STAFF',
  DRIVER: 'DRIVER',
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];
