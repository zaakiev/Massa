"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatReportDate } from "@/lib/format";

type ReportRow = {
  id: number;
  report_date: string;
  shift_no: number;
  officer_name: string;
  has_risks: boolean;
};

export function FeedClient() {
  const router = useRouter();
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/reports");
        if (!res.ok) {
          if (!cancelled) setError("Не удалось загрузить отчёты");
          return;
        }
        const data = (await res.json()) as { reports: ReportRow[] };
        if (!cancelled) setReports(data.reports);
      } catch {
        if (!cancelled) setError("Ошибка сети");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* proceed to login */
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="stack">
      <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
        <Link href="/reports/new" className="btn primary">
          Новый отчёт
        </Link>
        <Link href="/stats" className="btn secondary">
          Статистика
        </Link>
        <Link href="/settings" className="btn secondary">
          Настройки
        </Link>
        <button type="button" className="btn secondary" onClick={() => void onLogout()}>
          Выход
        </button>
      </div>
      <div className="muted">Общая база поста · Морской торговый порт Махачкала</div>

      {loading ? <div className="muted">Загрузка…</div> : null}
      {error ? <p role="alert">{error}</p> : null}

      {!loading && !error && reports.length === 0 ? (
        <div className="muted">Отчётов пока нет. Создайте первый.</div>
      ) : null}

      {reports.map((r) => (
        <Link key={r.id} href={`/reports/${r.id}`} className="card card-link">
          <div className="row" style={{ gap: 8 }}>
            <strong>{formatReportDate(r.report_date)}</strong>
            <span
              className={`pill ${r.has_risks ? "warn" : "ok"}`}
            >
              {r.has_risks ? "есть риски" : "без рисков"}
            </span>
          </div>
          <div className="muted" style={{ marginTop: 4 }}>
            Смена {r.shift_no} · {r.officer_name}
          </div>
        </Link>
      ))}
    </div>
  );
}