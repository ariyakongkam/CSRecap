"use client";

import { Check, Copy, Eye, Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { Modal } from "@/components/dialog";
import { inviteUrl, shareUrl } from "@/lib/strat/share";
import type { Strat } from "@/lib/strat/types";

type Kind = "view" | "edit";

const OPTIONS: {
  kind: Kind;
  icon: React.ReactNode;
  title: string;
  text: string;
  button: string;
}[] = [
  {
    kind: "view",
    icon: <Eye className="size-5" />,
    title: "Can view",
    text: "For the team: they can watch the strat, play it phase by phase and save their own copy.",
    button: "Copy view link",
  },
  {
    kind: "edit",
    icon: <Pencil className="size-5" />,
    title: "Can edit",
    text: "For a co-coach or IGL: they get the strat in their own planner to change. When they send their invite link back, you can update yours with their changes.",
    button: "Copy edit link",
  },
];

/**
 * Invite others to a strat with a link. There are no accounts or server: each link carries the whole strat,
 * so changes travel by sending links back and forth, not live.
 */
export function InviteDialog({
  open,
  onClose,
  strat,
}: {
  open: boolean;
  onClose: () => void;
  strat: Strat | null;
}) {
  const [copied, setCopied] = useState<Kind | null>(null);
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(null), 2500);
    return () => clearTimeout(t);
  }, [copied]);
  if (!strat) return null;

  const link = (k: Kind) =>
    k === "view" ? shareUrl(origin, strat) : inviteUrl(origin, strat);
  async function copy(k: Kind) {
    try {
      await navigator.clipboard.writeText(link(k));
      setCopied(k);
    } catch {
      // Clipboard blocked: select the link so it can be copied by hand.
      const field = document.getElementById(
        `invite-${k}`,
      ) as HTMLInputElement | null;
      field?.focus();
      field?.select();
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Invite others to this strat">
      {open && (
        <div className="space-y-4">
          {OPTIONS.map((o) => (
            <section
              key={o.kind}
              aria-labelledby={`invite-${o.kind}-title`}
              className="rounded-xl border border-line p-4"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="grid size-8 place-items-center rounded-lg bg-brand/12 text-brand"
                  aria-hidden="true"
                >
                  {o.icon}
                </span>
                <h3
                  id={`invite-${o.kind}-title`}
                  className="font-display text-xl font-semibold"
                >
                  {o.title}
                </h3>
              </div>
              <p className="mt-2 text-sm text-muted">{o.text}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <label className="sr-only" htmlFor={`invite-${o.kind}`}>
                  {o.title} link
                </label>
                <input
                  id={`invite-${o.kind}`}
                  readOnly
                  value={link(o.kind)}
                  onFocus={(e) => e.currentTarget.select()}
                  className="field min-w-0 flex-1 basis-48 text-sm text-muted"
                />
                <button
                  type="button"
                  className={`btn ${o.kind === "view" ? "btn-primary" : ""}`}
                  onClick={() => copy(o.kind)}
                  data-autofocus={o.kind === "view" ? true : undefined}
                >
                  {copied === o.kind ? (
                    <Check className="size-4" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                  {copied === o.kind ? "Copied" : o.button}
                </button>
              </div>
            </section>
          ))}
          <p className="text-sm text-faint" aria-live="polite">
            {copied
              ? `${copied === "view" ? "View" : "Edit"} link copied. Paste it in your team's Discord or a DM.`
              : "Changes don't sync live: each link holds the strat as it is now. Send a new link after you change it."}
          </p>
        </div>
      )}
    </Modal>
  );
}
