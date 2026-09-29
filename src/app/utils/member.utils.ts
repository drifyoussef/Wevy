/** Same palette and formula as the avatars of "Mon foyer" and "Horaires": a person keeps one color everywhere. */
const AVATAR_COLORS = ['#74B39D', '#4F8A76', '#6FA8DC', '#9FB5AC', '#5C9EA6'];

export function memberColor(name: string | undefined | null): string {
  return AVATAR_COLORS[(name || 'U').charCodeAt(0) % AVATAR_COLORS.length];
}

export function memberInitial(name: string | undefined | null): string {
  return (name || '?').trim().charAt(0).toUpperCase() || '?';
}
