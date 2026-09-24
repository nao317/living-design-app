export function ProtectedRouteFallback() {
  return (
    <main className="auth-callback">
      <p role="status">権限を確認しています…</p>
    </main>
  );
}
