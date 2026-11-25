"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatReportDate } from "@/lib/format";
import { formatTonnageDisplay, type PeriodStats } from "@/lib/stats";

type PeriodMode = "week" | "month" | "custom";

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function rangeForMode(mode: PeriodMode): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  if (mode === "week") {
    from.setDate(from.getDate() - 6);
  } else if (mode === "month") {
    from.setDate(from.getDate() - 29);
  } else {
    from.setDate(from.getDate() - 6);
  }
  return { from: isoDate(from), to: isoDate(to) };
}

export default function StatsPage() {
  const [mode, setMode] = useState<PeriodMode>("week");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [stats, setStats] = useState<PeriodStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const activeRange = useMemo(() => {
    if (mode === "custom" && customFrom && customTo && customFrom <= customTo) {
      return { from: customFrom, to: customTo };
    }
    if (mode === "custom") {
      return rangeForMode("week");
    }
    return rangeForMode(mode);
  }, [mode, customFrom, customTo]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams({
        from: activeRange.from,
        to: activeRange.to,
      });
      const res = await fetch(`/api/stats?${qs}`);
      if (!res.ok) {
        setError("Не удалось загрузить статистику");
        setStats(null);
        return;
      }
      const data = (await res.json()) as { stats: PeriodStats };
      setStats(data.stats);
    } catch {
      setError("Ошибка сети");
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [activeRange.from, activeRange.to]);

  useEffect(() => {
    void load();
  }, [load]);

  function selectCustom() {
    setMode("custom");
    if (!customFrom || !customTo) {
      const base = rangeForMode("week");
      setCustomFrom(base.from);
      setCustomTo(base.to);
    }
  }

  const periodLabel =
    stats &&
    `${formatReportDate(stats.from)}–${formatReportDate(stats.to)}`;

  return (
    <>
      <div className="app-header">Статистика</div>
      <div className="stack">
        <Link href="/" className="muted" style={{ fontSize: "0.85rem" }}>
          ← К ленте отчётов
        </Link>

        <div className="row" style={{ gap: 6 }}>
          <button
            type="button"
            className={`pill${mode === "week" ? " on" : ""}`}
            onClick={() => setMode("week")}
          >
            неделя
          </button>
          <button
            type="button"
            className={`pill${mode === "month" ? " on" : ""}`}
            onClick={() => setMode("month")}
          >
            месяц
          </button>
          <button
            type="button"
            className={`pill${mode === "custom" ? " on" : ""}`}
            onClick={selectCustom}
          >
            свой период
          </button>
        </div>

        {mode === "custom" ? (
          <div className="field-grid">
            <label>
              С
              <input
                type="date"
                className="input"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
              />
            </label>
            <label>
              По
              <input
                type="date"
                className="input"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
              />
            </label>
          </div>
        ) : null}

        {loading ? <div className="muted">Загрузка…</div> : null}
        {error ? <p role="alert">{error}</p> : null}

        {stats && !loading && !error ? (
          <>
            <div className="row">
              <div
                className={`stat${stats.downtimeHours > 0 ? " stat-warn" : ""}`}
              >
                <div className="stat-value">{stats.downtimeHours} часов</div>
                <div className="stat-label">простои</div>
              </div>
              <div className="stat">
                <div className="stat-value">{stats.vesselCount}</div>
                <div className="stat-label">судов</div>
              </div>
            </div>
            <div className="row">
              <div className="stat">
                <div className="stat-value">
                  {formatTonnageDisplay(stats.tonnageTons)}
                </div>
                <div className="stat-label">тонн</div>
              </div>
              <div className="stat">
                <div className="stat-value">{stats.reportCount}</div>
                <div className="stat-label">отчётов</div>
              </div>
            </div>

            <div className="section-title">По сменам</div>
            {stats.reportsPerShift.length === 0 ? (
              <div className="muted">Нет отчётов за период</div>
            ) : (
              stats.reportsPerShift.map((row) => (
                <div key={row.shiftNo} className="row between">
                  <span style={{ fontSize: "0.9rem" }}>
                    Смена {row.shiftNo}
                  </span>
                  <span className="muted">
                    {row.count}{" "}
                    {row.count === 1
                      ? "отчёт"
                      : row.count >= 2 && row.count <= 4
                        ? "отчёта"
                        : "отчётов"}
                  </span>
                </div>
              ))
            )}

            {periodLabel ? (
              <div className="muted">{periodLabel}</div>
            ) : null}
          </>
        ) : null}
      </div>
    </>
  );
}