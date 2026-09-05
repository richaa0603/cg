import { CircleCheck, Lock, ShieldQuestionMark } from "lucide-react";
import { getAccessMeta } from "../../lib/platform";

interface AccessBadgeProps {
  status: string;
}

export function AccessBadge({ status }: AccessBadgeProps) {
  const meta = getAccessMeta(status);
  const Icon = meta.tone === "ok" ? CircleCheck : meta.tone === "danger" ? Lock : ShieldQuestionMark;

  return (
    <span className={`g-badge g-badge--${meta.tone}`}>
      <Icon size={12} strokeWidth={2.4} />
      {meta.label}
    </span>
  );
}
