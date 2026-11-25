"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        setError("Неверный код доступа");
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

  return (
    <main className="login-page">
      <h1>Вход</h1>
      <form onSubmit={onSubmit}>
        <label htmlFor="code">Код доступа</label>
        <input
          id="code"
          className="input"
          type="password"
          name="code"
          autoComplete="current-password"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
        />
        {error ? <p role="alert">{error}</p> : null}
        <button type="submit" className="btn primary" disabled={submitting}>
          {submitting ? "…" : "Войти"}
        </button>
      </form>
    </main>
  );
}