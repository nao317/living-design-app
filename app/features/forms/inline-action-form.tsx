import type { ButtonHTMLAttributes, FormEvent, ReactNode } from "react";
import { useFetcher } from "react-router";
import { Button } from "../../components/atoms";

type ActionResult = { error?: string; saved?: boolean; deleted?: boolean };

export function InlineActionForm({
  children,
  className,
  confirmMessage,
  successMessage,
}: {
  children: (state: { pending: boolean }) => ReactNode;
  className?: string;
  confirmMessage?: string;
  successMessage?: string;
}) {
  const fetcher = useFetcher<ActionResult>();
  const pending = fetcher.state !== "idle";
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (confirmMessage && !window.confirm(confirmMessage)) event.preventDefault();
  };
  return (
    <>
      <fetcher.Form method="post" className={className} onSubmit={onSubmit} aria-busy={pending || undefined}>
        {children({ pending })}
      </fetcher.Form>
      {fetcher.data?.error ? <small className="field-error inline-action-feedback" role="alert">{fetcher.data.error}</small> : null}
      {successMessage && fetcher.data && !fetcher.data.error ? <small className="inline-action-success" role="status">{successMessage}</small> : null}
    </>
  );
}

export function PendingActionButton({ pending, pendingLabel, children, disabled, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & {
  pending: boolean;
  pendingLabel: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <Button {...props} type="submit" disabled={disabled || pending} aria-busy={pending || undefined}>
      {pending ? <span className="spinner" aria-hidden="true" /> : null}
      <span aria-live="polite">{pending ? pendingLabel : children}</span>
    </Button>
  );
}
