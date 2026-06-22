/**
 * Admin role utilities.
 *
 * An admin is determined by EITHER:
 *   1. User.role === 'admin' in the database (set via direct DB update)
 *   2. Username matches ADMIN_USERNAMES list (hardcoded fallback for bootstrap)
 *
 * The dual check ensures that even if the DB role field is missing (e.g.
 * before migration runs), the hardcoded admin still gets recognized.
 *
 * Admin privileges are purely cosmetic — a gold animated badge next to the
 * username in all UIs. No special powers (no moderation, no delete users).
 */

// Hardcoded list of admin usernames (case-sensitive).
// Add more usernames here to grant admin to other users.
export const ADMIN_USERNAMES: ReadonlySet<string> = new Set([
  'DDR_ZIK',
])

/**
 * Check if a username is an admin (hardcoded list).
 * Use this on the server when you don't have the DB row handy.
 */
export function isAdminUsername(username: string | null | undefined): boolean {
  if (!username) return false
  return ADMIN_USERNAMES.has(username)
}

/**
 * Check if a user is an admin (DB role OR hardcoded username).
 * Use this when you have the full user object from the DB.
 */
export function isUserAdmin(user: { username: string; role?: string | null } | null | undefined): boolean {
  if (!user) return false
  if (user.role === 'admin') return true
  return isAdminUsername(user.username)
}

/**
 * Sanitize a user object for API responses — adds an `isAdmin` boolean field.
 * Call this before returning user data from any API route.
 */
export function withAdminFlag<T extends { username: string; role?: string | null }>(
  user: T
): T & { isAdmin: boolean } {
  return {
    ...user,
    isAdmin: isUserAdmin(user),
  }
}
