/**
 * Shared avatar utilities for person (employee/user) avatars.
 * For entity avatars (teams, offices, clients), use EntityAvatar in entityVisuals.tsx.
 */

export const AVATAR_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-teal-500',
  'bg-indigo-500',
  'bg-red-500',
] as const;

/**
 * Deterministic color for a person avatar based on display name.
 * Same name always → same color.
 */
export function getAvatarColor(name: string): string {
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

/**
 * Split a full name string into first/last parts.
 * If explicit firstName/surname props are provided, prefer those.
 */
export function splitName(name?: string): { firstName: string; surname: string } {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', surname: '' };
  return {
    firstName: parts[0] ?? '',
    surname: parts[parts.length - 1] ?? '',
  };
}

/**
 * Generate 1-2 character initials for a person avatar.
 * Priority: explicit firstName/surname → split from name → first char of displayName.
 */
export function getPersonInitials(opts: {
  firstName?: string;
  surname?: string;
  name?: string;
}): string {
  const normalized = splitName(opts.name);
  const first = (opts.firstName ?? normalized.firstName).trim();
  const last = (opts.surname ?? normalized.surname).trim();
  const twoChar = `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
  if (twoChar.trim()) return twoChar;
  const display = [first, last].filter(Boolean).join(' ').trim() || opts.name?.trim() || 'U';
  return display.charAt(0).toUpperCase();
}
