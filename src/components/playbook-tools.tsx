"use client";

import { Check, Copy, Download, FolderOpen } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/dialog";
import { MAX_FILE_BYTES, bundleFromFile, bundleToFile, fileName, playbookUrl, type Bundle } from "@/lib/strat/bundle";

/** Offers text as a file download (backups and playbook files). */
export function downloadBundle(b: Bundle) {
  const blob = new Blob([bundleToFile(b)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName(b);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** "Open file": reads a backup or playbook file chosen by the user. */
export function OpenFileButton({ onBundle, onError }: { onBundle: (b: Bundle) => void; onError: (message: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <button type="button" className="btn" onClick={() => input.current?.click()}>
        <FolderOpen className="size-4" aria-hidden="true" />
        Open file
      </button>
      <input
        ref={input}
        type="file"
        accept=".json,application/json"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          if (file.size > MAX_FILE_BYTES) return onError("That file is too big to be a radstrat backup or playbook.");
          const b = bundleFromFile(await file.text());
          if (!b) return onError("That file isn't a radstrat backup or playbook file.");
          onBundle(b);
        }}
      />
    </>
  );
}

/** Share a whole playbook: a link for the team chat, or a file when the link gets too long for it. */
export function SharePlaybookDialog({ bundle, onClose }: { bundle: Bundle | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  useEffect(() => setCopied(false), [bundle]);
  const link = bundle && origin ? playbookUrl(origin, bundle) : "";
  const long = link.length > 2000;
  return (
    <Modal open={!!bundle} onClose={onClose} title={bundle ? `Share the playbook “${bundle.name}”` : "Share playbook"}>
      {bundle && (
        <div className="space-y-4">
          <p className="text-muted">
            Your team can view all {bundle.strats.length} {bundle.strats.length === 1 ? "strat" : "strats"} and save them in their own radstrat. Send it again
            after changes, and they can update theirs (their old versions are kept as copies).
          </p>
          <div className="flex flex-wrap gap-2">
            <label className="sr-only" htmlFor="playbook-link">
              Playbook link
            </label>
            <input id="playbook-link" readOnly value={link} onFocus={(e) => e.currentTarget.select()} className="field min-w-0 flex-1 basis-48 text-sm text-muted" />
            <button
              type="button"
              className="btn btn-primary"
              data-autofocus
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(link);
                  setCopied(true);
                } catch {
                  const f = document.getElementById("playbook-link") as HTMLInputElement | null;
                  f?.focus();
                  f?.select();
                }
              }}
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
          {long && (
            <p className="text-sm text-muted">
              This link is long ({link.length.toLocaleString()} characters). Some chat apps, like Discord, cut long messages: if it doesn&apos;t open, send
              the file instead. Teammates open it with “Open file” on their strats page.
            </p>
          )}
          <button type="button" className="btn" onClick={() => downloadBundle(bundle)}>
            <Download className="size-4" aria-hidden="true" />
            Download playbook file
          </button>
          <p className="sr-only" aria-live="polite">
            {copied ? "Link copied." : ""}
          </p>
        </div>
      )}
    </Modal>
  );
}
