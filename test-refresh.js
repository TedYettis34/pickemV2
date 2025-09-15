#!/usr/bin/env node
/**
 * Simple script to test refresh token functionality
 * Run this after logging into your app to test if refresh tokens work
 */

console.log('🔄 Refresh Token Test Guide');
console.log('');
console.log('✅ Changes Made:');
console.log('  • Removed aggressive token cleanup on page load');
console.log('  • Refresh failures no longer clear tokens automatically');
console.log('  • Reduced background refresh frequency (10 min intervals)');
console.log('  • Conservative token validation approach');
console.log('');
console.log('🧪 To Test:');
console.log('  1. Clear browser localStorage (Dev Tools -> Application -> Storage)');
console.log('  2. Sign in to your application');
console.log('  3. Wait for access token to expire (~1 hour)');
console.log('  4. OR manually trigger refresh: await refreshTokens() in browser console');
console.log('  5. Make an API call that requires authentication');
console.log('  6. Check console logs for refresh behavior');
console.log('');
console.log('📊 What to Look For:');
console.log('  SUCCESS: "✅ Token refreshed successfully"');
console.log('  FAILURE: "❌ Token refresh failed" (but tokens NOT cleared)');
console.log('  ERROR: "Invalid Refresh Token" (Cognito rejected it)');
console.log('');
console.log('🔍 If Refresh Still Fails:');
console.log('  1. Check if user has multiple logins/devices');
console.log('  2. Verify no recent password changes');
console.log('  3. Check AWS Console for user pool revocation settings');
console.log('  4. Try signing out and back in to get fresh tokens');
console.log('');
console.log('🎯 Expected Behavior:');
console.log('  • No double-login issues on fresh sign-in');
console.log('  • Refresh attempts when access token expires');
console.log('  • Only manual sign-out clears tokens');
console.log('  • Graceful degradation if refresh fails');
console.log('');
