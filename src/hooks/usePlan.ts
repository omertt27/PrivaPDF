"use client";
// usePlan.ts
// Syncs the user's plan from the server (Vercel KV) on sign-in,
// then caches it in localStorage for instant reads on subsequent page loads.
// Falls back gracefully if KV is unavailable or the user is not signed in.

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import {
  getPlan, activatePlan,
  type PlanTier, PLAN_META,
} from "@/lib/usage-gate";

export interface UsePlanReturn {
  plan: PlanTier;
  planMeta: typeof PLAN_META[PlanTier];
  isPaid: boolean;
  isSyncing: boolean;
  /** Call this after a successful checkout to persist to server + localStorage */
  savePlan: (plan: PlanTier, orderId: string) => Promise<void>;
}

export function usePlan(): UsePlanReturn {
  const { user, isLoaded } = useUser();
  const [plan, setPlanState] = useState<PlanTier>(getPlan);
  const [isSyncing, setIsSyncing] = useState(false);

  // On sign-in, fetch the server plan and sync it to localStorage
  useEffect(() => {
    if (!isLoaded) return;
    if (!user) return; // signed out — keep localStorage value

    let cancelled = false;
    setIsSyncing(true);

    fetch("/api/plan/get")
      .then((r) => r.json())
      .then((data: { plan: PlanTier; orderId?: string; fallback?: boolean }) => {
        if (cancelled) return;
        const serverPlan = data.plan as PlanTier;
        // Only upgrade the local plan — never downgrade (prevents race conditions)
        const planRank: Record<PlanTier, number> = { free: 0, individual: 1, pro: 2, legal: 3 };
        const localPlan = getPlan();
        if (planRank[serverPlan] > planRank[localPlan]) {
          activatePlan(serverPlan, data.orderId ?? "restored");
          setPlanState(serverPlan);
        } else {
          setPlanState(localPlan);
        }
      })
      .catch(() => {
        if (!cancelled) setPlanState(getPlan());
      })
      .finally(() => {
        if (!cancelled) setIsSyncing(false);
      });

    return () => { cancelled = true; };
  }, [isLoaded, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function savePlan(newPlan: PlanTier, orderId: string) {
    // 1. Write to localStorage immediately (fast, optimistic)
    activatePlan(newPlan, orderId);
    setPlanState(newPlan);

    // 2. Persist to server if user is signed in
    if (user) {
      try {
        await fetch("/api/plan/activate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: newPlan, orderId }),
        });
      } catch {
        // Server write failed — localStorage is still set, so the user is unblocked
        console.warn("[usePlan] Failed to persist plan to server");
      }
    }
  }

  return {
    plan,
    planMeta: PLAN_META[plan],
    isPaid: plan !== "free",
    isSyncing,
    savePlan,
  };
}
