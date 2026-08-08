import { Settings, Database, Key, Cloud } from 'lucide-react';

export function SetupScreen() {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
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
          <p className="text-muted text-sm mt-1">Configuration required</p>
        </div>

        <div className="card p-5 space-y-4">
          <p className="text-sm text-text">
            This app needs Supabase environment variables to function. Create a{' '}
            <code className="text-accent font-mono text-xs">.env</code> file in the project root with:
          </p>
          <pre className="bg-bg rounded-card p-3 text-xs font-mono text-muted overflow-x-auto border border-border">
{`VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here`}
          </pre>
          <p className="text-xs text-muted">See the README for full setup instructions.</p>
        </div>

        <div className="space-y-3">
          <SetupStep
            icon={<Cloud size={18} />}
            title="1. Create Supabase Project"
            desc="Go to supabase.com, create a free project, and run the migration SQL from /supabase/migration.sql"
          />
          <SetupStep
            icon={<Database size={18} />}
            title="2. Get API Credentials"
            desc="Find Project URL and anon key in Settings → API"
          />
          <SetupStep
            icon={<Key size={18} />}
            title="3. Set Environment Variables"
            desc="Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file"
          />
          <SetupStep
            icon={<Settings size={18} />}
            title="4. For AI Features"
            desc="Set GEMINI_API_KEY on Vercel for serverless AI functions"
          />
        </div>
      </div>
    </div>
  );
}

function SetupStep({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="flex-shrink-0 w-9 h-9 rounded-pill bg-accent/15 text-accent flex items-center justify-center">
        {icon}
      </div>
      <div>
        <h3 className="font-medium text-sm text-text">{title}</h3>
        <p className="text-xs text-muted mt-0.5">{desc}</p>
      </div>
    </div>
  );
}
