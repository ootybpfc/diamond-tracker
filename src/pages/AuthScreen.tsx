import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export function AuthScreen() {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const switchMode = (next: 'signin' | 'signup' | 'reset') => {
    setMode(next);
    setError(null);
    setNotice(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);

    try {
      if (mode === 'reset') {
        const { error } = await resetPassword(email);
        if (error) setError(error);
        else setNotice(`If an account exists for ${email}, a password reset link is on its way. Check your inbox and spam folder.`);
        return;
      }

      if (mode === 'signin') {
        const { error } = await signIn(email, password);
        if (error) setError(error);
        return;
      }

      const { error, needsConfirmation } = await signUp(email, password);
      if (error) {
        setError(error);
      } else if (needsConfirmation) {
        // Account created but unverified. Without this message the button just
        // stops spinning and nothing else happens, which reads as a failure.
        setNotice(`Almost there. We sent a confirmation link to ${email}. Open it to finish creating your account, then sign in. Check your spam folder if it isn't there in a minute.`);
        setPassword('');
      }
    } finally {
      setLoading(false);
    }
  };

  const submitLabel = mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link';

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4">
            <svg width="64" height="64" viewBox="0 0 512 512" fill="none">
              <path d="M256 104L342 206L256 408L170 206L256 104Z" fill="#E8A33D"/>
              <path d="M170 206L256 104L199 206L170 206Z" fill="#F0B253"/>
              <path d="M256 104L342 206L313 206L256 104Z" fill="#D89030"/>
              <path d="M170 206L256 408L256 206L170 206Z" fill="#E8A33D"/>
              <path d="M342 206L256 408L256 206L342 206Z" fill="#D89030"/>
            </svg>
          </div>
          <h1 className="font-display font-bold text-2xl text-text">Diamond Tracker</h1>
          <p className="text-muted text-sm mt-1">Log daily activities. Track prospects. Grow.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            data-testid="input-email"
          />
          {mode !== 'reset' && (
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              data-testid="input-password"
            />
          )}
          {error && <p className="text-danger text-sm" data-testid="text-error">{error}</p>}
          {notice && (
            <p
              className="text-sm text-accent bg-accent/10 border border-accent/30 rounded-lg px-3 py-2 leading-relaxed"
              data-testid="text-notice"
            >
              {notice}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={loading} data-testid="button-submit">
            {loading ? 'Please wait...' : submitLabel}
          </Button>
        </form>

        <button
          onClick={() => switchMode(mode === 'signup' ? 'signin' : 'signup')}
          className="w-full text-center text-sm text-muted hover:text-accent mt-4 transition-colors"
        >
          {mode === 'signup' ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
        </button>

        {mode !== 'signup' && (
          <button
            onClick={() => switchMode(mode === 'reset' ? 'signin' : 'reset')}
            className="w-full text-center text-sm text-muted hover:text-accent mt-2 transition-colors"
            data-testid="button-forgot-password"
          >
            {mode === 'reset' ? 'Back to sign in' : 'Forgot your password?'}
          </button>
        )}
      </div>
    </div>
  );
}
