"use client";

import { useState } from "react";
import { RisksPanel } from "@/components/RisksPanel";
import { SummaryPanel } from "@/components/SummaryPanel";
import { TablesPanel } from "@/components/TablesPanel";
import { formatReportDate } from "@/lib/format";
import type { ReportPayload } from "@/lib/types";

type Tab = "summary" | "tables" | "risks";

export function ReportCardClient({
  reportDate,
  shiftNo,
  officerName,
  photoCount,
  payload,
}: {
  reportDate: string;
  shiftNo: number;
  officerName: string;
  photoCount: number;
  payload: ReportPayload;
}) {
  const [tab, setTab] = useState<Tab>("summary");

  return (
    <div className="stack">
      <div>
        <strong>
          {formatReportDate(reportDate)} · смена {shiftNo}
        </strong>
        <div className="muted">
          {officerName} · {photoCount} фото
        </div>
      </div>

      <div className="row" role="tablist">
        {(
          [
            ["summary", "Сводка"],
            ["tables", "Таблицы"],
            ["risks", "Риски"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`btn secondary tab${tab === id ? " on" : ""}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "summary" ? <SummaryPanel payload={payload} /> : null}
      {tab === "tables" ? <TablesPanel payload={payload} /> : null}
      {tab === "risks" ? (
        <RisksPanel payload={payload} reportDate={reportDate} />
      ) : null}
    </div>
  );
}