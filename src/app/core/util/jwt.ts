const ROLE_CLAIMS = [
  'http://schemas.microsoft.com/ws/2008/06/identity/claims/role',
  'role',
  'roles',
];
const ID_CLAIMS = [
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier',
  'sub',
];
const EMAIL_CLAIMS = [
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
  'email',
];

export type JwtPayload = Record<string, unknown>;

export function decodeJwt(token: string): JwtPayload {
  try {
    const part = token.split('.')[1];
    const json = decodeURIComponent(
      atob(part.replace(/-/g, '+').replace(/_/g, '/'))
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    );
    return JSON.parse(json) as JwtPayload;
  } catch {
    return {};
  }
}

function pick(payload: JwtPayload, keys: string[]): unknown {
  for (const k of keys) if (payload[k] !== undefined) return payload[k];
  return undefined;
}

export function claimRoles(payload: JwtPayload): string[] {
  const raw = pick(payload, ROLE_CLAIMS);
  if (Array.isArray(raw)) return raw.map(String);
  return raw ? [String(raw)] : [];
}
export function claimId(payload: JwtPayload): string {
  return String(pick(payload, ID_CLAIMS) ?? '');
}
export function claimEmail(payload: JwtPayload): string {
  return String(pick(payload, EMAIL_CLAIMS) ?? '');
}
export function claimExpiryMs(payload: JwtPayload): number {
  const exp = Number(payload['exp']);
  return Number.isFinite(exp) ? exp * 1000 : 0;
}
