// ============================================================
// auth.js — login, sign-up, password reset, token refresh and
// page guards, using the Firebase Authentication REST API.
// The session (token) is kept in localStorage.
// ============================================================
const Auth = (function () {
  const SESSION_KEY = 'shop_session';
  const ID_URL = 'https://identitytoolkit.googleapis.com/v1/accounts:';
  const TOKEN_URL = 'https://securetoken.googleapis.com/v1/token';

  function load() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch (e) { return null; }
  }
  function save(session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  // Firebase returns expiresIn in seconds (usually 3600). Refresh 60 s early.
  function sessionFrom(r) {
    return {
      idToken: r.idToken,
      refreshToken: r.refreshToken,
      uid: r.localId,
      email: (r.email || '').toLowerCase(),
      expiresAt: Date.now() + (parseInt(r.expiresIn, 10) - 60) * 1000
    };
  }

  // Turn Firebase error codes into friendly messages
  function friendly(code) {
    code = code || '';
    if (/^(INVALID_LOGIN_CREDENTIALS|INVALID_PASSWORD|EMAIL_NOT_FOUND)/.test(code)) return 'Incorrect email or password.';
    if (/^EMAIL_EXISTS/.test(code)) return 'An account with this email already exists. Try signing in.';
    if (/^WEAK_PASSWORD/.test(code)) return 'Password must be at least 6 characters.';
    if (/^TOO_MANY_ATTEMPTS/.test(code)) return 'Too many attempts. Wait a few minutes and try again.';
    if (/^USER_DISABLED/.test(code)) return 'This account has been disabled.';
    if (/^INVALID_EMAIL/.test(code)) return 'Enter a valid email address.';
    if (/^OPERATION_NOT_ALLOWED/.test(code)) return 'Email/password sign-in is not enabled in Firebase.';
    if (/API key not valid/.test(code)) return 'Setup problem: check API_KEY in js/config.js.';
    return 'Something went wrong. Please try again.';
  }

  // All Auth REST calls go through Axios (JSON in, JSON out)
  async function call(endpoint, body) {
    try {
      const res = await axios.post(ID_URL + endpoint + '?key=' + CONFIG.API_KEY, body);
      return res.data;
    } catch (e) {
      if (!e.response) throw new Error('No internet connection.');
      const data = e.response.data;
      throw new Error(friendly(data && data.error ? data.error.message : ''));
    }
  }

  async function signIn(email, password) {
    const r = await call('signInWithPassword', { email: email, password: password, returnSecureToken: true });
    const s = sessionFrom(r);
    save(s);
    return s;
  }

  async function signUp(email, password) {
    const r = await call('signUp', { email: email, password: password, returnSecureToken: true });
    const s = sessionFrom(r);
    save(s);
    return s;
  }

  // Firebase emails a reset link. Same message whether or not the email exists (security).
  async function resetPassword(email) {
    await call('sendOobCode', { requestType: 'PASSWORD_RESET', email: email });
  }

  // "send mail (internally)" — Firebase sends a verification email after sign-up
  async function sendVerification(idToken) {
    await call('sendOobCode', { requestType: 'VERIFY_EMAIL', idToken: idToken });
  }

  // Tokens expire after 1 hour; get a new one with the refresh token
  async function refresh(s) {
    // This endpoint expects form data; Axios sends URLSearchParams as application/x-www-form-urlencoded
    const res = await axios.post(TOKEN_URL + '?key=' + CONFIG.API_KEY,
      new URLSearchParams({ grant_type: 'refresh_token', refresh_token: s.refreshToken }));
    const r = res.data;
    s.idToken = r.id_token;
    s.refreshToken = r.refresh_token;
    s.expiresAt = Date.now() + (parseInt(r.expires_in, 10) - 60) * 1000;
    save(s);
    return s;
  }

  // Used by api.js before every database request
  async function getToken() {
    let s = load();
    if (!s) return null;
    if (Date.now() >= s.expiresAt) {
      try { s = await refresh(s); } catch (e) { logout(false); return null; }
    }
    return s.idToken;
  }

  function user() { return load(); }
  function isLoggedIn() { return !!load(); }
  function isAdmin() {
    const s = load();
    return !!s && s.email === CONFIG.ADMIN_EMAIL.toLowerCase();
  }

  function logout(redirect) {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem('shop_cart');
    if (redirect !== false) location.href = Util.root() + 'login.html';
  }

  // ---- Page guards: call at the top of protected pages ----
  function requireCustomer() {
    if (!isLoggedIn()) {
      const here = location.pathname.split('/').pop() + location.search;
      location.href = Util.root() + 'login.html?next=' + encodeURIComponent(here);
      return false;
    }
    if (isAdmin()) { location.href = Util.root() + 'admin/index.html'; return false; }
    return true;
  }
  function requireAdmin() {
    if (!isAdmin()) { location.href = Util.root() + 'login.html'; return false; }
    return true;
  }

  return {
    signIn: signIn, signUp: signUp, resetPassword: resetPassword, sendVerification: sendVerification,
    getToken: getToken, user: user, isLoggedIn: isLoggedIn, isAdmin: isAdmin, logout: logout,
    requireCustomer: requireCustomer, requireAdmin: requireAdmin
  };
})();
