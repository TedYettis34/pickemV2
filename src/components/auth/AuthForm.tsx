'use client';

import { useState } from 'react';

interface AuthFormProps {
  onAuthSuccess?: () => void;
}

const CLIENT_ID = process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID;
const COGNITO_DOMAIN = 'https://pickem-dev-auth.auth.us-east-1.amazoncognito.com';

// Function to get the appropriate redirect URI based on environment
const getRedirectURI = () => {
  if (typeof window === 'undefined') {
    return 'http://localhost:3000/auth/callback';
  }
  
  const origin = window.location.origin;
  
  // For Vercel preview deployments, we need to ensure Cognito is configured for this domain
  if (origin.includes('.vercel.app')) {
    console.warn('⚠️ Vercel preview detected:', origin);
    console.warn('⚠️ Ensure this callback URL is configured in AWS Cognito:', `${origin}/auth/callback`);
  }
  
  return `${origin}/auth/callback`;
};

const REDIRECT_URI = getRedirectURI();

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function AuthForm({ onAuthSuccess: _onAuthSuccess }: AuthFormProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    lowercase: false,
    uppercase: false,
    numbers: false,
    symbols: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Basic validation
      if (!email) {
        if (process.env.NODE_ENV === 'test') {
          console.log('AuthForm: Setting email validation error');
        }
        setError('Please enter your email');
        setLoading(false);
        return;
      }

      // For signup, we still need password validation on our form
      if (!isLogin) {
        if (!password || !name || !isPasswordValid) {
          if (process.env.NODE_ENV === 'test') {
            console.log('AuthForm: Setting signup validation error');
          }
          setError('Please complete all required fields with valid information');
          setLoading(false);
          return;
        }
      }

      // Redirect to OAuth flow
      if (isLogin) {
        // For login, redirect to OAuth with login hint (email only)
        const loginUrl = `${COGNITO_DOMAIN}/login?` + new URLSearchParams({
          client_id: CLIENT_ID!,
          response_type: 'code',
          scope: 'email openid profile',
          redirect_uri: REDIRECT_URI,
          login_hint: email // Pre-fills email field
        });
        // Don't navigate during tests
        if (process.env.NODE_ENV !== 'test') {
          window.location.href = loginUrl;
        } else {
          console.log('AuthForm: Would navigate to', loginUrl);
          // Keep loading state in tests to show loading UI
        }
      } else {
        // For signup, redirect to OAuth signup
        const signupUrl = `${COGNITO_DOMAIN}/signup?` + new URLSearchParams({
          client_id: CLIENT_ID!,
          response_type: 'code',
          scope: 'email openid profile',
          redirect_uri: REDIRECT_URI,
          login_hint: email // Pre-fills email field
        });
        // Don't navigate during tests
        if (process.env.NODE_ENV !== 'test') {
          window.location.href = signupUrl;
        } else {
          console.log('AuthForm: Would navigate to', signupUrl);
          // Keep loading state in tests to show loading UI
        }
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      setLoading(false);
    }
  };

  const validatePassword = (password: string) => {
    setPasswordValidation({
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      numbers: /\d/.test(password),
      symbols: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    if (!isLogin) {
      validatePassword(newPassword);
    }
  };

  const handleToggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setPasswordValidation({
      length: false,
      lowercase: false,
      uppercase: false,
      numbers: false,
      symbols: false
    });
  };

  const isPasswordValid = Object.values(passwordValidation).every(Boolean);

  return (
    <div className="w-full max-w-md mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-white">
        {isLogin ? 'Sign In' : 'Create Account'}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLogin && (
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Display Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Enter your display name"
            />
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {name.length}/20 characters
            </div>
          </div>
        )}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder="Enter your email"
          />
        </div>
        {!isLogin && (
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={handlePasswordChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Enter your password"
            />
            {password && (
              <div className="mt-2 space-y-1">
                <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">Password requirements:</div>
                <div className={`flex items-center gap-2 text-xs ${passwordValidation.length ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  <span className={`w-2 h-2 rounded-full ${passwordValidation.length ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  At least 8 characters
                </div>
                <div className={`flex items-center gap-2 text-xs ${passwordValidation.lowercase ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  <span className={`w-2 h-2 rounded-full ${passwordValidation.lowercase ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  Contains lowercase letter
                </div>
                <div className={`flex items-center gap-2 text-xs ${passwordValidation.uppercase ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  <span className={`w-2 h-2 rounded-full ${passwordValidation.uppercase ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  Contains uppercase letter
                </div>
                <div className={`flex items-center gap-2 text-xs ${passwordValidation.numbers ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  <span className={`w-2 h-2 rounded-full ${passwordValidation.numbers ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  Contains number
                </div>
                <div className={`flex items-center gap-2 text-xs ${passwordValidation.symbols ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  <span className={`w-2 h-2 rounded-full ${passwordValidation.symbols ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  Contains symbol
                </div>
              </div>
            )}
          </div>
        )}
        {error && (
          <div className="text-red-600 dark:text-red-400 text-sm text-center">
            {error}
          </div>
        )}
        {typeof window !== 'undefined' && window.location.origin.includes('.vercel.app') && (
          <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-md p-3 text-sm">
            <div className="text-yellow-800 dark:text-yellow-200 font-medium mb-1">
              ⚠️ Vercel Preview Deployment
            </div>
            <div className="text-yellow-700 dark:text-yellow-300">
              This preview URL needs to be added to AWS Cognito callback URLs:
              <code className="block bg-yellow-100 dark:bg-yellow-800 px-2 py-1 rounded mt-1 text-xs font-mono break-all">
                {window.location.origin}/auth/callback
              </code>
            </div>
          </div>
        )}
        <button
          type="submit"
          disabled={loading || (!isLogin && !isPasswordValid)}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
        >
          {loading 
            ? (isLogin ? 'Redirecting to secure login...' : 'Redirecting to sign up...') 
            : (isLogin ? 'Continue to Sign In' : 'Continue to Sign Up')
          }
        </button>
        {isLogin && (
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
            You&apos;ll enter your password on the next page
          </div>
        )}
      </form>
      <div className="mt-4 text-center space-y-2">
        <button
          type="button"
          onClick={handleToggleMode}
          className="text-blue-600 hover:text-blue-700 text-sm underline block w-full"
        >
          {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          {isLogin 
            ? 'Forgot your password? You&apos;ll be able to reset it on the next page.' 
            : 'Email verification is handled automatically after signup.'
          }
        </div>
      </div>
    </div>
  );
}