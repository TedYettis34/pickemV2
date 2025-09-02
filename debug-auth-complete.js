// Complete Authentication Debug Script
// Run this in your browser console on the production site

console.log('=== COMPREHENSIVE AUTH DEBUG ===');

// 1. Check environment configuration
console.log('1. Environment Configuration:');
console.log('   Current Domain:', window.location.hostname);
console.log('   User Agent:', navigator.userAgent.substring(0, 100));

// 2. Check localStorage tokens
console.log('\n2. LocalStorage Token State:');
const tokens = {
  hasAccessToken: !!localStorage.getItem('accessToken'),
  hasIdToken: !!localStorage.getItem('idToken'), 
  hasRefreshToken: !!localStorage.getItem('refreshToken'),
  accessTokenLength: localStorage.getItem('accessToken')?.length || 0,
  refreshTokenLength: localStorage.getItem('refreshToken')?.length || 0,
  refreshTokenStart: localStorage.getItem('refreshToken')?.substring(0, 20) || 'none',
  lastLoginTime: localStorage.getItem('lastLoginTime'),
};
console.log('   Tokens:', tokens);

// 3. Decode and analyze access token
const accessToken = localStorage.getItem('accessToken');
if (accessToken) {
  try {
    console.log('\n3. Access Token Analysis:');
    const payload = JSON.parse(atob(accessToken.split('.')[1]));
    const tokenInfo = {
      client_id: payload.client_id,
      exp: new Date(payload.exp * 1000).toISOString(),
      iat: new Date(payload.iat * 1000).toISOString(), 
      token_use: payload.token_use,
      username: payload.username,
      isExpired: Date.now() > (payload.exp * 1000),
      minutesUntilExpiry: Math.round((payload.exp * 1000 - Date.now()) / 60000)
    };
    console.log('   Token Info:', tokenInfo);
    
    // Check for client ID mismatch
    if (payload.client_id !== '77jac49eg6mm1a38tc8v233stv') {
      console.error('   ❌ CLIENT ID MISMATCH DETECTED!');
      console.error('   Expected: 77jac49eg6mm1a38tc8v233stv');
      console.error('   Actual:   ' + payload.client_id);
      console.error('   This is likely the cause of refresh failures!');
    } else {
      console.log('   ✅ Client ID matches expected value');
    }
  } catch (e) {
    console.error('   Could not parse access token:', e.message);
  }
} else {
  console.log('\n3. No access token found');
}

// 4. Decode and analyze ID token
const idToken = localStorage.getItem('idToken');
if (idToken) {
  try {
    console.log('\n4. ID Token Analysis:');
    const payload = JSON.parse(atob(idToken.split('.')[1]));
    console.log('   ID Token Info:', {
      client_id: payload.aud, // audience = client_id for ID tokens
      exp: new Date(payload.exp * 1000).toISOString(),
      token_use: payload.token_use,
      email: payload.email,
      name: payload.name,
      isExpired: Date.now() > (payload.exp * 1000)
    });
  } catch (e) {
    console.error('   Could not parse ID token:', e.message);
  }
} else {
  console.log('\n4. No ID token found');
}

// 5. Test refresh token manually
const refreshToken = localStorage.getItem('refreshToken');
if (refreshToken) {
  console.log('\n5. Refresh Token Test:');
  console.log('   Token length:', refreshToken.length);
  console.log('   Token start:', refreshToken.substring(0, 20));
  
  // Attempt refresh
  console.log('   Attempting manual token refresh...');
  
  fetch('/api/test-refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      refreshToken: refreshToken,
      clientId: '77jac49eg6mm1a38tc8v233stv'
    })
  }).then(response => {
    console.log('   Refresh test response status:', response.status);
    return response.json();
  }).then(data => {
    console.log('   Refresh test result:', data);
  }).catch(error => {
    console.log('   Refresh test failed:', error.message);
  });
} else {
  console.log('\n5. No refresh token found');
}

// 6. Simulate clearing and recommend actions
console.log('\n6. Recommended Actions:');
if (tokens.hasRefreshToken && tokens.hasAccessToken) {
  console.log('   ✓ Tokens exist - check client ID mismatch above');
  console.log('   ✓ If client ID mismatches, clear localStorage and re-login');
  console.log('   ✓ To clear: localStorage.clear()');
} else {
  console.log('   ❌ Missing tokens - user needs to log in');
}

console.log('\n=== DEBUG COMPLETE ===');
