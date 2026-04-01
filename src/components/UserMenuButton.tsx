"use client";
// UserMenuButton.tsx
// Shows a sign-in button for guests, or a Clerk UserButton for signed-in users.
// Drops into any nav without layout changes.

import { useUser, UserButton, SignInButton } from "@clerk/nextjs";
import { usePlan } from "@/hooks/usePlan";

export function UserMenuButton() {
  const { isLoaded, isSignedIn } = useUser();
  const { plan, isSyncing } = usePlan();

  if (!isLoaded) return null;

  if (isSignedIn) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {isSyncing && (
          <span style={{ fontSize: 11, color: "var(--muted)" }}>Syncing…</span>
        )}
        {plan !== "free" && (
          <span style={{
            fontSize: 11, fontWeight: 600, letterSpacing: 0.5,
            color: "var(--accent)", background: "var(--accent-light)",
            padding: "3px 10px", borderRadius: 20,
          }}>
            {plan.charAt(0).toUpperCase() + plan.slice(1)}
          </span>
        )}
        <UserButton
          appearance={{
            elements: {
              avatarBox: { width: 30, height: 30 },
            },
          }}
        />
      </div>
    );
  }

  return (
    <SignInButton mode="modal">
      <button style={{
        background: "none",
        border: "1px solid var(--border)",
        borderRadius: 6,
        padding: "7px 14px",
        fontSize: 13,
        fontWeight: 500,
        color: "var(--muted)",
        cursor: "pointer",
        fontFamily: "var(--sans)",
        whiteSpace: "nowrap",
      }}>
        Sign in
      </button>
    </SignInButton>
  );
}
