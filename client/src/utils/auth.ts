export const setToken = (token: string, rememberMe: boolean) => {
  if (rememberMe) {
    localStorage.setItem('sb-token', token);
    sessionStorage.removeItem('sb-token');
  } else {
    sessionStorage.setItem('sb-token', token);
    localStorage.removeItem('sb-token');
  }
};

export const getToken = (): string | null => {
  return localStorage.getItem('sb-token') || sessionStorage.getItem('sb-token');
};

export const removeToken = () => {
  localStorage.removeItem('sb-token');
  sessionStorage.removeItem('sb-token');
};

export const getAAL = (): 'aal1' | 'aal2' | null => {
  const token = getToken();
  if (!token) return null;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.aal || 'aal1';
  } catch (e) {
    return 'aal1';
  }
};
