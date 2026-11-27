import { NAMES, type NameKey } from './names';

const TOKEN = /\{(\w+)\}/g;

/** Replace {name} tokens in every string of a JSON value. Unknown tokens are left for validation to report. */
export function interpolate<T>(value: T): T {
  if (typeof value === 'string') {
    return value.replace(TOKEN, (match, key: string) =>
      key in NAMES ? NAMES[key as NameKey] : match,
    ) as T;
  }
  if (Array.isArray(value)) return value.map(interpolate) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, interpolate(v)])) as T;
  }
  return value;
}

/** Any {tokens} still left in a value after interpolation, with their JSON paths. */
export function leftoverTokens(value: unknown, path = ''): string[] {
  if (typeof value === 'string') {
    return [...value.matchAll(TOKEN)].map((m) => `${path}: unknown name token ${m[0]}`);
  }
  if (Array.isArray(value)) return value.flatMap((v, i) => leftoverTokens(v, `${path}.${i}`));
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => leftoverTokens(v, path ? `${path}.${k}` : k));
  }
  return [];
}
