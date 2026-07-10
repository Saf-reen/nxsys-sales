const STORAGE_KEY = 'auth_session';
// Legacy key: refresh tokens now live in an httpOnly cookie; kept only to purge old sessions.
const LEGACY_REFRESH_KEY = 'auth_refresh';

export const authSessionStorage = {
  getToken: () => localStorage.getItem(STORAGE_KEY),
  getUser: () => {
    try {
      const user = localStorage.getItem('auth_user');
      return user ? JSON.parse(user) : null;
    } catch { return null; }
  },
  setSession: (token: string, user: any) => {
    localStorage.setItem(STORAGE_KEY, token);
    localStorage.setItem('auth_user', JSON.stringify(user));
    localStorage.removeItem(LEGACY_REFRESH_KEY);
  },
  clearSession: () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_REFRESH_KEY);
    localStorage.removeItem('auth_user');
  }
};
