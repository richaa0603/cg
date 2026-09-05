import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, body, action }: EmptyStateProps) {
  return (
    <div className="g-empty g-fade-in">
      <span className="g-empty__icon" aria-hidden="true">
        {icon}
      </span>
      <h3 className="g-empty__title">{title}</h3>
      <p className="g-empty__body">{body}</p>
      {action}
    </div>
  );
}
