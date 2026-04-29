// Keeps useProStore in sync with the server based on the current account.
import { useEffect } from "react";
import { useAccountId } from "@/hooks/useAccountId";
import { useProStore } from "@/stores/useProStore";

export function ProSyncProvider({ children }: { children: React.ReactNode }) {
  const accountId = useAccountId();
  const refresh = useProStore((s) => s.refresh);
  useEffect(() => {
    refresh(accountId);
  }, [accountId, refresh]);
  return <>{children}</>;
}
