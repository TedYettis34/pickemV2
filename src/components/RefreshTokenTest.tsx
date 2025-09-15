'use client';

import { useState } from 'react';
import { refreshTokens, refreshTokensSDK, refreshTokensAlternative, refreshOAuthTokens, logout } from '../lib/auth';
import { validateAdminAuthClient } from '../lib/adminAuth';

export default function RefreshTokenTest() {
  const [status, setStatus] = useState<string>('Ready to test');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    setLogs(prev => [...prev, logMessage]);
    console.log(logMessage);
  };

  const testRefreshToken = async () => {
    setStatus('Testing...');
    setLogs([]);
    
    try {
      // Check current tokens
      const accessToken = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');
      
      addLog(`Access token present: ${!!accessToken}`);
      addLog(`Refresh token present: ${!!refreshToken}`);
      addLog(`Access token length: ${accessToken?.length || 0}`);
      addLog(`Refresh token length: ${refreshToken?.length || 0}`);

      if (!refreshToken) {
        setStatus('❌ No refresh token found - please sign in first');
        return;
      }

      addLog('🔄 Attempting token refresh with InitiateAuth...');
      const refreshSuccess = await refreshTokens();
      
      if (refreshSuccess) {
        addLog('✅ Refresh successful!');
        
        // Test the new token with an API call
        const newAccessToken = localStorage.getItem('accessToken');
        if (newAccessToken) {
          addLog('🧪 Testing new token with admin API...');
          const adminResult = await validateAdminAuthClient(newAccessToken);
          addLog(`Admin validation: ${adminResult.isAdmin ? 'Success' : 'Failed'}`);
          if (adminResult.error) {
            addLog(`Admin error: ${adminResult.error}`);
          }
        }
        
        setStatus('✅ Refresh token test completed successfully!');
      } else {
        addLog('❌ Refresh failed');
        setStatus('❌ Refresh token test failed');
      }
    } catch (error) {
      addLog(`❌ Error during test: ${error}`);
      setStatus('❌ Test error occurred');
    }
  };

  const testAlternativeRefresh = async () => {
    setStatus('Testing alternative method...');
    setLogs([]);
    
    try {
      // Check current tokens
      const accessToken = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');
      
      addLog(`Access token present: ${!!accessToken}`);
      addLog(`Refresh token present: ${!!refreshToken}`);
      addLog(`Access token length: ${accessToken?.length || 0}`);
      addLog(`Refresh token length: ${refreshToken?.length || 0}`);

      if (!refreshToken) {
        setStatus('❌ No refresh token found - please sign in first');
        return;
      }

      addLog('🔄 Attempting token refresh with GetTokensFromRefreshToken...');
      const refreshSuccess = await refreshTokensAlternative();
      
      if (refreshSuccess) {
        addLog('✅ Alternative refresh successful!');
        
        // Test the new token with an API call
        const newAccessToken = localStorage.getItem('accessToken');
        if (newAccessToken) {
          addLog('🧪 Testing new token with admin API...');
          const adminResult = await validateAdminAuthClient(newAccessToken);
          addLog(`Admin validation: ${adminResult.isAdmin ? 'Success' : 'Failed'}`);
          if (adminResult.error) {
            addLog(`Admin error: ${adminResult.error}`);
          }
        }
        
        setStatus('✅ Alternative refresh token test completed successfully!');
      } else {
        addLog('❌ Alternative refresh failed');
        setStatus('❌ Alternative refresh token test failed');
      }
    } catch (error) {
      addLog(`❌ Error during alternative test: ${error}`);
      setStatus('❌ Alternative test error occurred');
    }
  };

  const testSDKRefresh = async () => {
    setStatus('Testing SDK refresh...');
    setLogs([]);
    
    try {
      // Check current tokens
      const accessToken = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');
      
      addLog(`Access token present: ${!!accessToken}`);
      addLog(`Refresh token present: ${!!refreshToken}`);
      addLog(`Access token length: ${accessToken?.length || 0}`);
      addLog(`Refresh token length: ${refreshToken?.length || 0}`);

      if (!refreshToken) {
        setStatus('❌ No refresh token found - please sign in first');
        return;
      }

      addLog('🔄 Attempting SDK token refresh with InitiateAuth...');
      const refreshSuccess = await refreshTokensSDK();
      
      if (refreshSuccess) {
        addLog('✅ SDK refresh successful!');
        
        // Test the new token with an API call
        const newAccessToken = localStorage.getItem('accessToken');
        if (newAccessToken) {
          addLog('🧪 Testing new token with admin API...');
          const adminResult = await validateAdminAuthClient(newAccessToken);
          addLog(`Admin validation: ${adminResult.isAdmin ? 'Success' : 'Failed'}`);
          if (adminResult.error) {
            addLog(`Admin error: ${adminResult.error}`);
          }
        }
        
        setStatus('✅ SDK refresh token test completed successfully!');
      } else {
        addLog('❌ SDK refresh failed');
        setStatus('❌ SDK refresh token test failed');
      }
    } catch (error) {
      addLog(`❌ Error during SDK test: ${error}`);
      setStatus('❌ SDK test error occurred');
    }
  };

  const testOAuthRefresh = async () => {
    setStatus('Testing OAuth refresh...');
    setLogs([]);
    
    try {
      // Check current tokens
      const accessToken = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');
      
      addLog(`Access token present: ${!!accessToken}`);
      addLog(`Refresh token present: ${!!refreshToken}`);
      addLog(`Access token length: ${accessToken?.length || 0}`);
      addLog(`Refresh token length: ${refreshToken?.length || 0}`);

      if (!refreshToken) {
        setStatus('❌ No refresh token found - please sign in first');
        return;
      }

      addLog('🔄 Attempting OAuth token refresh...');
      const refreshSuccess = await refreshOAuthTokens();
      
      if (refreshSuccess) {
        addLog('✅ OAuth refresh successful!');
        
        // Test the new token with an API call
        const newAccessToken = localStorage.getItem('accessToken');
        if (newAccessToken) {
          addLog('🧪 Testing new token with admin API...');
          const adminResult = await validateAdminAuthClient(newAccessToken);
          addLog(`Admin validation: ${adminResult.isAdmin ? 'Success' : 'Failed'}`);
          if (adminResult.error) {
            addLog(`Admin error: ${adminResult.error}`);
          }
        }
        
        setStatus('✅ OAuth refresh token test completed successfully!');
      } else {
        addLog('❌ OAuth refresh failed');
        setStatus('❌ OAuth refresh token test failed');
      }
    } catch (error) {
      addLog(`❌ Error during OAuth test: ${error}`);
      setStatus('❌ OAuth test error occurred');
    }
  };

  const clearTokensTest = () => {
    addLog('🧹 Clearing access token only (keeping refresh token)');
    localStorage.removeItem('accessToken');
    addLog('Access token cleared - refresh token preserved');
  };

  const showTokenInfo = () => {
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    const lastLogin = localStorage.getItem('lastLoginTime');
    
    addLog('📊 Current token status:');
    addLog(`  Access Token: ${accessToken ? 'Present (' + accessToken.length + ' chars)' : 'Missing'}`);
    addLog(`  Refresh Token: ${refreshToken ? 'Present (' + refreshToken.length + ' chars)' : 'Missing'}`);
    addLog(`  Last Login: ${lastLogin || 'Unknown'}`);
    
    if (accessToken) {
      try {
        const payload = JSON.parse(atob(accessToken.split('.')[1]));
        const expiresAt = new Date(payload.exp * 1000);
        const now = new Date();
        const minutesUntilExpiry = Math.round((expiresAt.getTime() - now.getTime()) / (1000 * 60));
        addLog(`  Token expires: ${expiresAt.toLocaleString()}`);
        addLog(`  Minutes until expiry: ${minutesUntilExpiry}`);
      } catch {
        addLog('  Could not decode access token');
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">🧪 Refresh Token Test</h2>
      
      <div className="mb-4">
        <p className="text-lg mb-2">Status: <span className="font-mono">{status}</span></p>
      </div>

      <div className="space-x-2 mb-6">
        <button 
          onClick={showTokenInfo}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          📊 Show Token Info
        </button>
        <button 
          onClick={testRefreshToken}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          🔄 Test Refresh (OAuth-only)
        </button>
        <button 
          onClick={testSDKRefresh}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          🔄 Test SDK Refresh (Legacy)
        </button>
        <button 
          onClick={testAlternativeRefresh}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
        >
          🔄 Test Alternative (GetTokens)
        </button>
        <button 
          onClick={testOAuthRefresh}
          className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
        >
          🔄 Test OAuth (Direct)
        </button>
        <button 
          onClick={clearTokensTest}
          className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
        >
          🧹 Clear Access Token
        </button>
        <button 
          onClick={logout}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          🚪 Logout
        </button>
      </div>

      <div className="bg-gray-100 p-4 rounded">
        <h3 className="font-bold mb-2">Test Log:</h3>
        <div className="h-64 overflow-y-auto font-mono text-sm">
          {logs.map((log, i) => (
            <div key={i} className="mb-1">{log}</div>
          ))}
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <p><strong>How to use:</strong></p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Make sure you&apos;re signed in first</li>
          <li>Click &quot;Show Token Info&quot; to see current status</li>
          <li>Click &quot;Test Refresh&quot; to test the refresh mechanism</li>
          <li>Or click &quot;Clear Access Token&quot; then make an API call to trigger auto-refresh</li>
        </ol>
      </div>
    </div>
  );
}
