"use client";

import { Check, CloudOff, Download, LogIn, LogOut, RefreshCw, Trash2, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/dialog";
import { deleteAccount, getAccount, onSyncStatus, signOut, startAutoSync, syncNow, type Account, type SyncStatus } from "@/lib/strat/cloud";
import { PRIVACY_CONTACT } from "@/lib/links";
import { deleteStrat, listStrats } from "@/lib/strat/storage";

/**
 * Starts syncing when the player is signed in, and again whenever they come back to the tab
 * (so a strat saved on the other PC shows up). `onChanged` runs when strats arrived or were removed here.
 */
export function useCloudSync(onChanged?: () => void): Account | null {
  const [account, setAccount] = useState<Account | null>(null);
  const changed = useRef(onChanged);
  changed.current = onChanged;
  useEffect(() => {
    let live = true;
    let last = 0;
    const run = async () => {
      last = Date.now();
      if ((await syncNow()) > 0) changed.current?.();
    };
    const onFocus = () => {
      if (Date.now() - last > 30_000) void run();
    };
    getAccount().then((a) => {
      if (!live) return;
      setAccount(a);
      if (a.signedIn) {
        startAutoSync();
        void run();
        window.addEventListener("focus", onFocus);
      }
    });
    return () => {
      live = false;
      window.removeEventListener("focus", onFocus);
    };
  }, []);
  return account;
}

const STATUS_TEXT: Record<SyncStatus, string> = {
  off: "Not syncing",
  syncing: "Saving to your account…",
  synced: "Saved to your account",
  offline: "Offline: will save when back online",
};

/**
 * Sign in with Steam, or (when signed in) the account menu: sync state, download my data,
 * sign out and delete account. Shows nothing when the site has no server side.
 */
export function AccountButton({ account, compact = false, onChanged }: { account: Account | null; compact?: boolean; onChanged?: () => void }) {
  const [status, setStatus] = useState<SyncStatus>("off");
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState<"signout" | "delete" | null>(null);
  const [clearLocal, setClearLocal] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => onSyncStatus(setStatus), []);

  // Sign-in only appears once the privacy page names a contact (GDPR) and the server side exists.
  if (!account?.enabled || !PRIVACY_CONTACT) return null;
  if (!account.signedIn) {
    return (
      <a href="/api/auth/steam" className="btn" title="Save your strats to your Steam account, so they're on every PC">
        <LogIn className="size-4" aria-hidden="true" />
        <span className={compact ? "max-sm:sr-only" : ""}>Sign in with Steam</span>
      </a>
    );
  }
  const Icon = status === "offline" ? CloudOff : status === "syncing" ? RefreshCw : Check;
  return (
    <>
      <button type="button" className="btn" onClick={() => setOpen(true)} aria-label={`Your account: ${STATUS_TEXT[status]}`}>
        <UserRound className="size-4" aria-hidden="true" />
        <Icon className={`size-3.5 ${status === "offline" ? "text-danger" : "text-brand"} ${status === "syncing" ? "motion-safe:animate-spin" : ""}`} aria-hidden="true" />
        <span className={compact ? "max-lg:sr-only" : ""}>Account</span>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Your radstrat account">
        <div className="space-y-4">
          <p className="flex items-center gap-2">
            <UserRound className="size-5" aria-hidden="true" /> Signed in with Steam
          </p>
          <p className="text-sm text-muted" aria-live="polite">
            {STATUS_TEXT[status]}. Your strats are saved in this browser and in your account, so they show up on every PC where you sign in.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              className="btn"
              onClick={async () => {
                const n = await syncNow();
                setMessage(n ? `${n} ${n === 1 ? "strat" : "strats"} updated from your account.` : "Everything is up to date.");
                if (n) onChanged?.();
              }}
            >
              <RefreshCw className="size-4" aria-hidden="true" /> Sync now
            </button>
            <a href="/api/account/export" className="btn" download>
              <Download className="size-4" aria-hidden="true" /> Download my data
            </a>
            <button type="button" className="btn" onClick={() => {
                setOpen(false);
                setConfirm("signout");
              }}>
              <LogOut className="size-4" aria-hidden="true" /> Sign out
            </button>
            <button type="button" className="btn text-danger" onClick={() => {
                setOpen(false);
                setConfirm("delete");
              }}>
              <Trash2 className="size-4" aria-hidden="true" /> Delete my account
            </button>
          </div>
          <p className="text-sm text-muted" role="status">
            {message}
          </p>
          <p className="text-sm text-faint">
            radstrat only gets your SteamID from Steam: no email and no name.{" "}
            <Link href="/privacy" className="link-slide text-muted">
              Privacy
            </Link>
          </p>
        </div>
      </Modal>

      <Modal open={confirm === "signout"} onClose={() => setConfirm(null)} title="Sign out?">
        <div className="space-y-4">
          <p className="text-muted">Your strats stay in your account. On a shared PC, also remove them from this browser.</p>
          <label className="flex min-h-11 items-center gap-3">
            <input type="checkbox" className="size-5 accent-[var(--brand)]" checked={clearLocal} onChange={(e) => setClearLocal(e.target.checked)} />
            Also remove my strats from this browser
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-primary"
              data-autofocus
              onClick={async () => {
                await signOut();
                if (clearLocal) for (const s of listStrats()) deleteStrat(s.id);
                window.location.href = "/app";
              }}
            >
              Sign out
            </button>
            <button type="button" className="btn" onClick={() => setConfirm(null)}>
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={confirm === "delete"} onClose={() => setConfirm(null)} title="Delete your account?">
        <div className="space-y-4">
          <p className="text-muted">
            This deletes your account and every strat saved in it from radstrat&apos;s server, and signs you out. It can&apos;t be undone. The strats in this
            browser stay here; download your data first if you want a file.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-danger"
              onClick={async () => {
                const ok = await deleteAccount();
                if (ok) window.location.href = "/app?deleted=1";
                else setMessage("Couldn't delete the account right now. Try again in a moment.");
                setConfirm(null);
              }}
            >
              Delete my account
            </button>
            <button type="button" className="btn" data-autofocus onClick={() => setConfirm(null)}>
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
