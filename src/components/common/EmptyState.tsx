interface EmptyStateProps {
  title: string;
  description?: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <p className="text-base font-medium">{title}</p>
      {description && (
        <p className="mt-1 text-sm text-(--muted-foreground)">{description}</p>
      )}
    </div>
  );
}
