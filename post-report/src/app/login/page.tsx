"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [bootstrapMode, setBootstrapMode] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/status");
        if (!res.ok) return;
        const data = (await res.json()) as { configured: boolean };
        if (!cancelled) {
          setConfigured(data.configured);
          setBootstrapMode(!data.configured);
        }
      } catch {
        if (!cancelled) setConfigured(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (bootstrapMode) {
        const bootRes = await fetch("/api/auth/bootstrap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
        if (!bootRes.ok) {
          const data = (await bootRes.json().catch(() => ({}))) as {
            error?: string;
          };
          setError(
            data.error === "bootstrap not allowed"
              ? "Код поста уже настроен"
              : "Не удалось создать код поста",
          );
          if (bootRes.status === 403) {
            setBootstrapMode(false);
            setConfigured(true);
          }
          return;
        }
      }

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        setError(
          bootstrapMode ? "Не удалось войти после создания кода" : "Неверный код доступа",
        );
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Ошибка сети");
    } finally {
      setSubmitting(false);
    }
  }

  if (configured === null) {
    return (
      <main className="login-page">
        <p className="muted">Загрузка…</p>
      </main>
    );
  }

  return (
    <main className="login-page">
      <h1>{bootstrapMode ? "Первый запуск" : "Вход"}</h1>
      {bootstrapMode ? (
        <p className="muted" style={{ marginBottom: 12 }}>
          Код поста ещё не задан. Придумайте код доступа для всех пользователей
          поста.
        </p>
      ) : null}
      <form onSubmit={onSubmit}>
        <label htmlFor="code">
          {bootstrapMode ? "Создать код поста" : "Код доступа"}
        </label>
        <input
          id="code"
          className="input"
          type="password"
          name="code"
          autoComplete={bootstrapMode ? "new-password" : "current-password"}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
        />
        {error ? <p role="alert">{error}</p> : null}
        <button type="submit" className="btn primary" disabled={submitting}>
          {submitting ? "…" : bootstrapMode ? "Создать и войти" : "Войти"}
        </button>
      </form>
    </main>
  );
}