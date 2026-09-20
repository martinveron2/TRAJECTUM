export const isFiniteNonNegative = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

export const isFinitePositive = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;
