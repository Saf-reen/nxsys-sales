const STORAGE_KEY = 'auth_session';
const REFRESH_KEY = 'auth_refresh';

export const authSessionStorage = {
  getToken: () => localStorage.getItem(STORAGE_KEY),
  getRefreshToken: () => localStorage.getItem(REFRESH_KEY),
  getUser: () => {
    try {
      const user = localStorage.getItem('auth_user');
      return user ? JSON.parse(user) : null;
    } catch { return null; }
  },
  setSession: (token: string, user: any, refresh?: string) => {
    localStorage.setItem(STORAGE_KEY, token);
    localStorage.setItem('auth_user', JSON.stringify(user));
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  },
  clearSession: () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem('auth_user');
  }
};
