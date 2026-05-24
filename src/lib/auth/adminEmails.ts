/**
 * Canonical platform-admin email list.
 *
 * This is the client-safe copy: it has NO server-only imports, so it can be
 * referenced from client components (e.g. the dashboard sidebar / pages) as
 * well as server code. It mirrors ADMIN_EMAILS in `adminAuth.ts`, which holds
 * the server-side `getAdminUser()` helper. Keep the two lists in sync.
 */
export const ADMIN_EMAILS = [
  "joshuaooi105@gmail.com",
  "ghayuan.ng@gmail.com",
  "jjzlee018@gmail.com",
];

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.includes(email);
}
