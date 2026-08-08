import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fn = mode === 'signin' ? signIn : signUp;
    const { error } = await fn(email, password);
    if (error) setError(error);
    setLoading(false);
  };

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
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            data-testid="input-password"
          />
          {error && <p className="text-danger text-sm" data-testid="text-error">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading} data-testid="button-submit">
            {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </Button>
        </form>

        <button
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          className="w-full text-center text-sm text-muted hover:text-accent mt-4 transition-colors"
        >
          {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}
