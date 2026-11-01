import { createContext, use, useCallback, useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { Form, useActionData, useBeforeUnload, useBlocker, useNavigation } from "react-router";
import { Button } from "../../components/atoms";
import type { FieldErrors } from "./validation";

type FormResult = { fieldErrors?: FieldErrors; saved?: boolean; sent?: boolean; submitted?: boolean; error?: string };
const ErrorsContext = createContext<FieldErrors>({});
const PendingContext = createContext(false);
export function useFieldErrors() { return use(ErrorsContext); }

function constraintMessage(control: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) {
  if (control.validity.valueMissing) return control instanceof HTMLSelectElement ? "選択してください。" : "入力してください。";
  if (control.validity.typeMismatch) return control.type === "email" ? "メールアドレスの形式を確認してください。" : "URLの形式を確認してください。";
  if (control.validity.tooShort) return `${(control as HTMLInputElement).minLength}文字以上で入力してください。`;
  if (control.validity.rangeUnderflow) return `${(control as HTMLInputElement).min}以上で入力してください。`;
  if (control.validity.rangeOverflow) return `${(control as HTMLInputElement).max}以下で入力してください。`;
  if (control.validity.stepMismatch || control.validity.badInput) return "有効な数値を入力してください。";
  return "入力内容を確認してください。";
}

function UnsavedChangesGuard({ dirty }: { dirty: boolean }) {
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && (currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search));
  useBeforeUnload(useCallback((event) => {
    if (dirty) { event.preventDefault(); event.returnValue = ""; }
  }, [dirty]));
  useEffect(() => {
    if (blocker.state !== "blocked") return;
    if (window.confirm("保存していない変更があります。変更を破棄して移動しますか？")) blocker.proceed();
    else blocker.reset();
  }, [blocker]);
  return null;
}

export function ManagedForm({ children, protect = false, onChange, onSubmit, ...props }: ComponentProps<typeof Form> & { children: ReactNode; protect?: boolean }) {
  const result = useActionData<FormResult>();
  const navigation = useNavigation();
  const pending = navigation.state !== "idle" && Boolean(navigation.formMethod && navigation.formMethod.toLowerCase() !== "get");
  const form = useRef<HTMLFormElement>(null);
  const [edits, setEdits] = useState({ dirty: false, result });
  const successful = result?.saved || result?.sent || result?.submitted;
  const dirty = edits.dirty && !(successful && edits.result !== result);
  const [clientErrors, setClientErrors] = useState<FieldErrors>({});
  const errors = { ...result?.fieldErrors, ...clientErrors };

  useEffect(() => {
    if (result?.fieldErrors) form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [result]);

  return <ErrorsContext value={errors}><PendingContext value={pending}>
    {protect ? <UnsavedChangesGuard dirty={dirty} /> : null}
    <Form {...props} ref={form} noValidate aria-busy={pending || undefined}
      onChange={(event) => {
        setEdits((current) => current.dirty && current.result === result ? current : { dirty: true, result });
        const target = event.target;
        const name = target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement ? target.name : "";
        if (name) setClientErrors((current) => current[name] || result?.fieldErrors?.[name] ? { ...current, [name]: "" } : current);
        onChange?.(event);
      }}
      onSubmit={(event) => {
        if (pending) { event.preventDefault(); return; }
        const nextErrors: FieldErrors = {};
        let firstInvalid: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | undefined;
        for (const control of event.currentTarget.elements) {
          if ((control instanceof HTMLInputElement || control instanceof HTMLSelectElement || control instanceof HTMLTextAreaElement) && control.name && !control.validity.valid) {
            nextErrors[control.name] = constraintMessage(control);
            firstInvalid ??= control;
          }
        }
        if (firstInvalid) { event.preventDefault(); setClientErrors(nextErrors); firstInvalid.focus(); return; }
        setClientErrors({});
        onSubmit?.(event);
      }}>{children}</Form>
  </PendingContext></ErrorsContext>;
}

export function SubmitButton({ children, pendingLabel = "保存中…", disabled, ...props }: ComponentProps<typeof Button> & { pendingLabel?: string }) {
  const pending = use(PendingContext);
  return <Button {...props} type="submit" aria-busy={pending || undefined} disabled={disabled || pending}>
    {pending ? <span className="spinner" aria-hidden="true" /> : null}<span aria-live="polite">{pending ? pendingLabel : children}</span>
  </Button>;
}
