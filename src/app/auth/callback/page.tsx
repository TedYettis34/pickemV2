'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Processing...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const error = searchParams.get('error');

        if (error) {
          setError(`OAuth Error: ${error}`);
          return;
        }

        if (!code) {
          setError('No authorization code received');
          return;
        }

        setStatus('Exchanging code for tokens...');

        // Exchange authorization code for tokens
        const tokenResponse = await fetch('https://pickem-dev-auth.auth.us-east-1.amazoncognito.com/oauth2/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: '77jac49eg6mm1a38tc8v233stv',
            code: code,
            redirect_uri: 'http://localhost:3000/auth/callback',
          }),
        });

        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          throw new Error(`Token exchange failed: ${tokenResponse.status} - ${errorText}`);
        }

        const tokens = await tokenResponse.json();
        
        console.log('🎉 OAuth tokens received:', {
          hasAccessToken: !!tokens.access_token,
          hasIdToken: !!tokens.id_token,
          hasRefreshToken: !!tokens.refresh_token,
          tokenType: tokens.token_type,
          expiresIn: tokens.expires_in,
          refreshTokenLength: tokens.refresh_token?.length || 0
        });

        // Store tokens in localStorage
        if (tokens.access_token) {
          localStorage.setItem('accessToken', tokens.access_token);
        }
        if (tokens.id_token) {
          localStorage.setItem('idToken', tokens.id_token);
        }
        if (tokens.refresh_token) {
          localStorage.setItem('refreshToken', tokens.refresh_token);
        }
        localStorage.setItem('lastLoginTime', new Date().toISOString());
        
        // Mark these tokens as OAuth for proper refresh method selection
        localStorage.setItem('loginMethod', 'oauth');

        setStatus('✅ Login successful! Redirecting...');
        
        // Redirect to main app after a short delay
        setTimeout(() => {
          router.push('/');
        }, 2000);

      } catch (err) {
        console.error('OAuth callback error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      }
    };

    handleCallback();
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Authentication Error</h1>
            <p className="text-gray-700 mb-6">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Signing you in...</h1>
          <p className="text-gray-600">{status}</p>
        </div>
      </div>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Loading...</h1>
            <p className="text-gray-600">Preparing authentication...</p>
          </div>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
