export const API_BASE = '';

export function apiPath(path: string) {
  return path.startsWith('/') ? path : '/' + path;
}
