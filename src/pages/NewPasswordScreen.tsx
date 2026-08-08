import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

/**
 * Shown after a password-reset link is opened. Supabase signs the user in at
 * that point, so without this step they would silently land in the app still
 * holding their old (forgotten) password.
 */
export function NewPasswordScreen() {
  const { updatePassword, signOut } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await updatePassword(password);
      if (error) setError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-display font-bold text-2xl text-text">Choose a new password</h1>
          <p className="text-muted text-sm mt-1">Set a password you'll use to sign in from now on.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            data-testid="input-new-password"
          />
          <Input
            type="password"
            placeholder="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={6}
            data-testid="input-confirm-password"
          />
          {error && <p className="text-danger text-sm" data-testid="text-error">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading} data-testid="button-save-password">
            {loading ? 'Saving...' : 'Save Password'}
          </Button>
        </form>

        <button
          onClick={() => void signOut()}
          className="w-full text-center text-sm text-muted hover:text-accent mt-4 transition-colors"
        >
          Cancel and sign out
        </button>
      </div>
    </div>
  );
}
