/** Public one-click demo logins (seeded by `npm run seed:demo`). Their credentials are shown on the login page. */
export const DEMO_PASSWORD = 'Demo12345!';
export const DEMO_ADMIN_EMAIL = 'demo-admin@example.com';
export const DEMO_USER_EMAIL = 'demo-user@example.com';

const demoEmails = new Set([DEMO_ADMIN_EMAIL, DEMO_USER_EMAIL]);

export function isDemoAccount(email: string | undefined): boolean {
  return !!email && demoEmails.has(email.toLowerCase());
}
