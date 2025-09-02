// Debug script to check token state
// Run this in your browser console to see current tokens

console.log('=== TOKEN DEBUG INFO ===');
console.log('Environment CLIENT_ID:', process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID);
console.log('LocalStorage tokens:', {
  hasAccessToken: !!localStorage.getItem('accessToken'),
  hasIdToken: !!localStorage.getItem('idToken'), 
  hasRefreshToken: !!localStorage.getItem('refreshToken'),
  accessTokenLength: localStorage.getItem('accessToken')?.length || 0,
  refreshTokenLength: localStorage.getItem('refreshToken')?.length || 0,
  refreshTokenStart: localStorage.getItem('refreshToken')?.substring(0, 20) || 'none',
  lastLoginTime: localStorage.getItem('lastLoginTime'),
});

// Check token expiration
const accessToken = localStorage.getItem('accessToken');
if (accessToken) {
  try {
    const payload = JSON.parse(atob(accessToken.split('.')[1]));
    console.log('Access Token Info:', {
      exp: new Date(payload.exp * 1000).toISOString(),
      iat: new Date(payload.iat * 1000).toISOString(), 
      client_id: payload.client_id,
      token_use: payload.token_use,
      isExpired: Date.now() > (payload.exp * 1000)
    });
  } catch (e) {
    console.log('Could not parse access token:', e);
  }
}
