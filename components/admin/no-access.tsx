import { ShieldOff } from "lucide-react";

import { EmptyState } from "@/components/admin/ui";

export function NoAccess() {
  return (
    <div className="rounded-2xl border border-gray-200/80 bg-white">
      <EmptyState
        icon={ShieldOff}
        title="No access"
        description="The owner has not granted this permission to your account."
      />
    </div>
  );
}
