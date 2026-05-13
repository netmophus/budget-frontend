import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface DashboardCardProps {
  to: string;
  icon: LucideIcon;
  title: string;
  description: string;
}

export function DashboardCard({
  to,
  icon: Icon,
  title,
  description,
}: DashboardCardProps) {
  return (
    <Link
      to={to}
      className={cn(
        'block rounded-lg border border-(--border) bg-(--card) text-(--card-foreground) p-6 shadow-sm transition',
        'hover:shadow-md hover:-translate-y-0.5 hover:border-(--primary)/40',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--primary)',
      )}
    >
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-(--primary)/10 text-(--primary)">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 space-y-1">
          <h3 className="text-base font-semibold leading-tight">{title}</h3>
          <p className="text-sm text-(--muted-foreground)">{description}</p>
        </div>
      </div>
    </Link>
  );
}
