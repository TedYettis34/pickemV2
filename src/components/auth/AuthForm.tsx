"use client";

import { useState } from "react";
import { signIn, signUp, signInWithGoogle } from "../../lib/firebase/auth";

interface AuthFormProps {
  onSuccess?: () => void;
}

export default function AuthForm({ onSuccess }: AuthFormProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    lowercase: false,
    uppercase: false,
    numbers: false,
    symbols: false,
  });

  const isPasswordValid = Object.values(passwordValidation).every(Boolean);

  const validatePassword = (value: string) => {
    setPasswordValidation({
      length: value.length >= 8,
      lowercase: /[a-z]/.test(value),
      uppercase: /[A-Z]/.test(value),
      numbers: /\d/.test(value),
      symbols: /[!@#$%^&*(),.?":{}|<>]/.test(value),
    });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    if (!isLogin) {
      validatePassword(value);
    }
  };

  const toggleMode = () => {
    setIsLogin((prev) => !prev);
    setError("");
    setPassword("");
    setPasswordValidation({
      length: false,
      lowercase: false,
      uppercase: false,
      numbers: false,
      symbols: false,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email) {
      setError("Please enter your email");
      return;
    }
    if (!password) {
      setError("Please enter your password");
      return;
    }
    if (!isLogin && !isPasswordValid) {
      setError("Please choose a password that meets all requirements");
      return;
    }

    setLoading(true);
    try {
      const result = isLogin
        ? await signIn(email, password)
        : await signUp(email, password);

      if (result.success) {
        onSuccess?.();
      } else {
        setError(result.error || "Authentication failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result.success) {
        onSuccess?.();
      } else {
        setError(result.error || "Google sign-in failed");
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-white">
        {isLogin ? "Sign In" : "Create Account"}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
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
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
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
          {!isLogin && password && (
            <div className="mt-2 space-y-1">
              <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                Password requirements:
              </div>
              {[
                { key: "length", label: "At least 8 characters" },
                { key: "lowercase", label: "Contains lowercase letter" },
                { key: "uppercase", label: "Contains uppercase letter" },
                { key: "numbers", label: "Contains number" },
                { key: "symbols", label: "Contains symbol" },
              ].map(({ key, label }) => {
                const met = passwordValidation[key as keyof typeof passwordValidation];
                return (
                  <div
                    key={key}
                    className={`flex items-center gap-2 text-xs ${
                      met
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        met ? "bg-green-500" : "bg-red-500"
                      }`}
                    ></span>
                    {label}
                  </div>
                );
              })}
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
          disabled={loading || googleLoading || (!isLogin && !isPasswordValid)}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
        >
          {loading
            ? isLogin
              ? "Signing in..."
              : "Creating account..."
            : isLogin
            ? "Sign In"
            : "Create Account"}
        </button>
      </form>

      <div className="mt-4 flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
        <span className="text-xs text-gray-400 dark:text-gray-500">or</span>
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      </div>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={loading || googleLoading}
        className="mt-4 w-full border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 text-gray-700 dark:text-gray-200 font-medium py-2 px-4 rounded-md transition-colors"
      >
        {googleLoading ? "Signing in..." : "Continue with Google"}
      </button>

      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={toggleMode}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          {isLogin
            ? "Don't have an account? Sign up"
            : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
