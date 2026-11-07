"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";

/**
 * Confirmation that collects a reason. Stays open and shows the error if the action fails.
 * onConfirm(reason) must resolve to { ok: true } or { ok: false, error }.
 */
export default function ReasonDialog({
  open, onOpenChange, title, description, confirmLabel, destructive = false, reasonRequired = true, minLength = 5, onConfirm,
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  function handleOpenChange(next) {
    if (busy) return;
    if (!next) {
      setReason("");
      setError(null);
    }
    onOpenChange(next);
  }

  async function submit() {
    const trimmed = reason.trim();
    if (reasonRequired && trimmed.length < minLength) {
      setError(`Give a reason (at least ${minLength} characters).`);
      return;
    }
    setBusy(true);
    setError(null);
    const result = await onConfirm(trimmed);
    setBusy(false);
    if (result?.ok) handleOpenChange(false);
    else setError(result?.error ?? "Something went wrong.");
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        {description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
        <div className="mt-4 space-y-3">
          <label htmlFor="reason" className="text-sm font-medium">
            Reason{reasonRequired ? "" : " (optional)"}
          </label>
          <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} aria-invalid={error ? true : undefined} />
          {error ? <Alert tone="error">{error}</Alert> : null}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <AlertDialogCancel className={buttonVariants({ variant: "outline" })} disabled={busy}>Cancel</AlertDialogCancel>
          <Button variant={destructive ? "destructive" : "default"} onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            {confirmLabel}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
