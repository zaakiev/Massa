"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Officer = { id: number; full_name: string };
type Shift = { id: number; shift_no: number };

export default function SettingsPanel() {
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [officerName, setOfficerName] = useState("");
  const [shiftNo, setShiftNo] = useState("");
  const [newCode, setNewCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const loadDirectories = useCallback(async () => {
    const [officersRes, shiftsRes] = await Promise.all([
      fetch("/api/officers"),
      fetch("/api/shifts"),
    ]);
    if (officersRes.status === 401 || shiftsRes.status === 401) {
      window.location.href = "/login";
      return;
    }
    if (!officersRes.ok || !shiftsRes.ok) {
      setError("Не удалось загрузить справочники");
      return;
    }
    const officersJson = (await officersRes.json()) as { officers: Officer[] };
    const shiftsJson = (await shiftsRes.json()) as { shifts: Shift[] };
    setOfficers(officersJson.officers);
    setShifts(shiftsJson.shifts);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadDirectories();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadDirectories]);

  async function onAddOfficer(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    const res = await fetch("/api/officers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: officerName }),
    });
    if (res.status === 409) {
      setError("Такой инспектор уже есть");
      return;
    }
    if (!res.ok) {
      setError("Не удалось добавить инспектора");
      return;
    }
    setOfficerName("");
    setMessage("Инспектор добавлен");
    await loadDirectories();
  }

  async function onDeleteOfficer(id: number) {
    setError("");
    const res = await fetch(`/api/officers/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Не удалось удалить инспектора");
      return;
    }
    await loadDirectories();
  }

  async function onAddShift(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    const parsed = Number.parseInt(shiftNo, 10);
    const res = await fetch("/api/shifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shift_no: parsed }),
    });
    if (res.status === 409) {
      setError("Такая смена уже есть");
      return;
    }
    if (!res.ok) {
      setError("Не удалось добавить смену");
      return;
    }
    setShiftNo("");
    setMessage("Смена добавлена");
    await loadDirectories();
  }

  async function onDeleteShift(id: number) {
    setError("");
    const res = await fetch(`/api/shifts/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Не удалось удалить смену");
      return;
    }
    await loadDirectories();
  }

  async function onChangeCode(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    const res = await fetch("/api/settings/post-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: newCode }),
    });
    if (!res.ok) {
      setError("Не удалось изменить код доступа");
      return;
    }
    setNewCode("");
    setMessage("Код доступа обновлён");
  }

  if (loading) {
    return <main><p>Загрузка…</p></main>;
  }

  return (
    <main>
      <h1>Настройки</h1>
      {error ? <p role="alert">{error}</p> : null}
      {message ? <p>{message}</p> : null}

      <section>
        <h2>Инспекторы</h2>
        <ul>
          {officers.map((o) => (
            <li key={o.id}>
              {o.full_name}{" "}
              <button type="button" onClick={() => onDeleteOfficer(o.id)}>
                Удалить
              </button>
            </li>
          ))}
        </ul>
        <form onSubmit={onAddOfficer}>
          <label htmlFor="officer">ФИО</label>
          <input
            id="officer"
            value={officerName}
            onChange={(e) => setOfficerName(e.target.value)}
            required
          />
          <button type="submit">Добавить</button>
        </form>
      </section>

      <section>
        <h2>Смены</h2>
        <ul>
          {shifts.map((s) => (
            <li key={s.id}>
              Смена {s.shift_no}{" "}
              <button type="button" onClick={() => onDeleteShift(s.id)}>
                Удалить
              </button>
            </li>
          ))}
        </ul>
        <form onSubmit={onAddShift}>
          <label htmlFor="shift">Номер смены</label>
          <input
            id="shift"
            type="number"
            min={1}
            value={shiftNo}
            onChange={(e) => setShiftNo(e.target.value)}
            required
          />
          <button type="submit">Добавить</button>
        </form>
      </section>

      <section>
        <h2>Код доступа</h2>
        <form onSubmit={onChangeCode}>
          <label htmlFor="code">Новый код</label>
          <input
            id="code"
            type="password"
            autoComplete="new-password"
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            required
          />
          <button type="submit">Сохранить</button>
        </form>
      </section>
    </main>
  );
}