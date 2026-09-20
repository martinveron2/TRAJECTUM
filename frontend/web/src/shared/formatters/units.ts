export const formatMm = (value: number | null | undefined, digits = 1) =>
  value == null ? '—' : value.toFixed(digits) + ' mm';

export const formatMetersPerSecond = (value: number | null | undefined, digits = 1) =>
  value == null ? '—' : value.toFixed(digits) + ' m/s';

export const formatPascals = (value: number | null | undefined, digits = 0) =>
  value == null ? '—' : value.toFixed(digits) + ' Pa';

export const formatCalibers = (value: number | null | undefined, digits = 2) =>
  value == null ? '—' : value.toFixed(digits) + ' cal';
