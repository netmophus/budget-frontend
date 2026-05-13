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
        // Surface + bordure neutre + bordure gauche transparente au repos
        'block rounded-md border border-(--border) bg-(--background) p-4',
        'border-l-[3px] border-l-transparent',
        // Hover signature charte v1 : border-left ambre + transition 150ms
        // PAS de scale, PAS d'ombre portée, PAS de glow.
        'hover:border-l-[#BA7517] transition-colors duration-150',
        // Focus-ring accessibilité (shadcn standard, conservé)
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--primary)',
      )}
    >
      <div className="flex items-start gap-4">
        <Icon className="h-6 w-6 shrink-0 text-[#0C447C]" />
        <div className="flex-1 space-y-1">
          <h3 className="text-sm font-medium leading-tight text-(--foreground)">
            {title}
          </h3>
          <p className="text-xs leading-relaxed text-(--muted-foreground)">
            {description}
          </p>
        </div>
      </div>
    </Link>
  );
}
