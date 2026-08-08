import { useMemo } from 'react';
import { Users, UserPlus, MessageSquare, TrendingUp, CheckCircle2, Clock } from 'lucide-react';
import { useData } from '../hooks/useData';
import { Card, SectionHeader } from '../components/ui/Card';
import { StatCard } from '../components/StatCard';
import { Heatmap } from '../components/Heatmap';
import { AccountabilityChart } from '../components/AccountabilityChart';
import { DtmMomentum } from '../components/DtmMomentum';
import { Badge } from '../components/ui/Badge';
import { formatDate, startOfWeek, currentMonth } from '../lib/utils';

export function Dashboard() {
  const { associations, contentEntries, people, dittoLogs, dtmLogs, accountabilityDays, checklistTemplate, loading } = useData();

  const stats = useMemo(() => {
    const weekStart = startOfWeek(new Date());
    const weekStartStr = formatDate(weekStart);
    const todayStr = formatDate(new Date());
    // Bound both ends: a future-dated row would otherwise inflate "this week".
    const inThisWeek = (date: string) => date >= weekStartStr && date <= todayStr;

    const dtmThisWeek = accountabilityDays
      .filter((a) => inThisWeek(a.date))
      .reduce((sum, a) => sum + (a.dtm_count ?? 0), 0);

    const activitiesThisWeek =
      associations.filter((a) => inThisWeek(a.date)).length +
      contentEntries.filter((c) => inThisWeek(c.date)).length +
      dtmThisWeek;

    const customerCount = people.filter((p) => p.category === 'customer' || p.category === 'both').length;
    const prospectCount = people.filter((p) => p.category === 'prospect' || p.category === 'both').length;

    const dittoThisMonth = dittoLogs.find((d) => d.month === currentMonth());

    // Streak: consecutive days with >=1 qualifying activity (Ditto excluded)
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = formatDate(d);
      const hasActivity =
        associations.some((a) => a.date === dateStr) ||
        contentEntries.some((c) => c.date === dateStr) ||
        accountabilityDays.some((day) => day.date === dateStr && (day.dtm_count ?? 0) > 0);
      if (hasActivity) {
        streak++;
      } else if (i > 0) {
        break;
      }
      // i === 0: if today has no activity yet, don't break the streak — keep counting
    }

    return {
      activitiesThisWeek,
      customerCount,
      prospectCount,
      dtmThisWeek,
      dittoDone: Boolean(dittoThisMonth),
      streak,
    };
  }, [accountabilityDays, associations, contentEntries, dittoLogs, people]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-5 safe-top">
      <div>
        <h1 className="font-display font-bold text-xl text-text">Dashboard</h1>
        <p className="text-muted text-sm">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="This Week" value={stats.activitiesThisWeek} icon={<TrendingUp size={12} />} />
        <StatCard label="Streak" value={`${stats.streak}d`} icon={<TrendingUp size={12} />} accent="sage" />
        <StatCard label="Customers" value={stats.customerCount} icon={<Users size={12} />} accent="sage" />
        <StatCard label="Candidates" value={stats.prospectCount} icon={<UserPlus size={12} />} accent="clay" />
        <StatCard label="DTM This Week" value={stats.dtmThisWeek} icon={<MessageSquare size={12} />} />
        <StatCard
          label="Ditto Status"
          value={stats.dittoDone ? 'Done' : 'Pending'}
          icon={stats.dittoDone ? <CheckCircle2 size={12} /> : <Clock size={12} />}
          accent={stats.dittoDone ? 'sage' : 'clay'}
        />
      </div>

      {/* Heatmap */}
      <Card>
        <SectionHeader title="Activity Heatmap" />
        <Heatmap associations={associations} contentEntries={contentEntries} accountabilityDays={accountabilityDays} />
      </Card>

      {/* Per-task consistency for the user's own Accountability list */}
      <Card>
        <SectionHeader title="Accountability" />
        <AccountabilityChart
          accountabilityDays={accountabilityDays}
          checklistTemplate={checklistTemplate}
        />
      </Card>

      {/* DTM is a count, so it gets its own scale rather than being stacked */}
      <Card>
        <SectionHeader title="DTM Momentum" />
        <DtmMomentum accountabilityDays={accountabilityDays} networkDtmCount={dtmLogs.length} />
      </Card>

      {/* Ditto note */}
      <div className="flex items-center gap-2 text-xs text-muted">
        <Badge variant={stats.dittoDone ? 'sage' : 'clay'}>
          {stats.dittoDone ? 'Ditto logged' : 'Ditto pending'}
        </Badge>
        <span>Ditto is a monthly check-in — not counted in daily streaks.</span>
      </div>
    </div>
  );
}
