'use client';

import { useState } from 'react';
import { signUp, signIn, confirmSignUp, resendConfirmationCode } from '../../lib/auth';

interface AuthFormProps {
  onAuthSuccess: () => void;
}

export default function AuthForm({ onAuthSuccess }: AuthFormProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
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
      if (isConfirming) {
        await confirmSignUp(name, confirmationCode);
        setIsConfirming(false);
        setIsLogin(true);
        setError('Account confirmed! Please log in.');
      } else if (isLogin) {
        await signIn(email, password);
        onAuthSuccess();
      } else {
        await signUp(email, password, name);
        setIsConfirming(true);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    try {
      await resendConfirmationCode(name);
      setError('Confirmation code resent!');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to resend code';
      setError(errorMessage);
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

  if (isConfirming) {
    return (
      <div className="w-full max-w-md mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-white">
          Confirm Your Account
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="confirmationCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Confirmation Code
            </label>
            <input
              type="text"
              id="confirmationCode"
              value={confirmationCode}
              onChange={(e) => setConfirmationCode(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Enter confirmation code"
              required
            />
          </div>
          {error && (
            <div className="text-red-600 dark:text-red-400 text-sm text-center">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            {loading ? 'Confirming...' : 'Confirm Account'}
          </button>
          <button
            type="button"
            onClick={handleResendCode}
            className="w-full text-blue-600 hover:text-blue-700 text-sm underline"
          >
            Resend confirmation code
          </button>
        </form>
      </div>
    );
  }

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
              required
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
            required
          />
        </div>
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
            required
          />
          {!isLogin && password && (
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
        {error && (
          <div className="text-red-600 dark:text-red-400 text-sm text-center">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={loading || (!isLogin && !isPasswordValid)}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
        >
          {loading ? (isLogin ? 'Signing In...' : 'Creating Account...') : (isLogin ? 'Sign In' : 'Create Account')}
        </button>
      </form>
      <div className="mt-4 text-center space-y-2">
        <button
          type="button"
          onClick={handleToggleMode}
          className="text-blue-600 hover:text-blue-700 text-sm underline block w-full"
        >
          {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
        {isLogin && (
          <button
            type="button"
            onClick={() => setIsConfirming(true)}
            className="text-blue-600 hover:text-blue-700 text-sm underline block w-full"
          >
            Need to confirm your account?
          </button>
        )}
      </div>
    </div>
  );
}