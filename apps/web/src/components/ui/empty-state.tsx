interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      {icon && (
        <div aria-hidden="true" className="text-gray-300">
          {icon}
        </div>
      )}
      <div className="flex flex-col gap-1">
        <p className="text-base font-medium text-gray-900">{title}</p>
        {description && (
          <p className="text-sm text-gray-500">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
