import { LABELS } from "@/lib/labels";
import type { ReportPayload } from "@/lib/types";
import { LineList } from "./LineList";

function downtimeDayHours(downtime: ReportPayload["downtime"]): number {
  let total = 0;
  for (const d of downtime) {
    const start = parseHm(d.startedAt);
    const end = parseHm(d.endedAt);
    if (start !== null && end !== null && end > start) {
      total += (end - start) / 60;
    }
  }
  return Math.round(total);
}

function parseHm(value: string): number | null {
  const m = value.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return Number.parseInt(m[1], 10) * 60 + Number.parseInt(m[2], 10);
}

function formatYtdHours(hours: number | null): string {
  if (hours === null) return "—";
  return `${Math.round(hours)} ч`;
}

export function SummaryPanel({ payload }: { payload: ReportPayload }) {
  const dayDowntime = downtimeDayHours(payload.downtime);
  const vhItems = [
    {
      key: "total",
      text: `Всего товарных партий — ${payload.vhSummary.totalBatches}`,
    },
    ...payload.vhSummary.byGoods.map((g, i) => ({
      key: `good-${i}`,
      text: `${g.name} — ${g.count}`,
    })),
    {
      key: "released",
      text: `${LABELS.releasedDt} — ${payload.vhSummary.releasedDt}`,
    },
  ];

  const shiftItems = [
    { key: "do1", text: `${LABELS.do1} — ${payload.shiftOps.do1}` },
    { key: "do2", text: `${LABELS.do2} — ${payload.shiftOps.do2}` },
    {
      key: "tn",
      text: `${LABELS.customsWatch} — ${payload.shiftOps.customsWatch}`,
    },
    {
      key: "dtImport",
      text: `${LABELS.dtImport} — ${payload.shiftOps.dtImport}`,
    },
    {
      key: "dtExport",
      text: `${LABELS.dtExport} — ${payload.shiftOps.dtExport}`,
    },
    {
      key: "pdt",
      text: `ПДТ с начала года (нарастающим) — ${payload.shiftOps.pdtCumulative}`,
    },
  ];

  const nshsText = payload.nshsTp.present
    ? payload.nshsTp.description || LABELS.nshsTpFull
    : `${LABELS.nshsTpFull} — за смену не зафиксирована`;

  return (
    <div className="stack">
      <div className="row">
        <div className="stat">
          <div className="stat-value">{payload.roadstead.length}</div>
          <div className="stat-label">на рейде</div>
        </div>
        <div className="stat">
          <div className="stat-value">{payload.waitingDeparture.length}</div>
          <div className="stat-label">ожидание убытия</div>
        </div>
      </div>
      <div className="row">
        <div
          className={`stat${dayDowntime > 0 ? " stat-warn" : ""}`}
        >
          <div className="stat-value">{dayDowntime} ч</div>
          <div className="stat-label">простой за сутки</div>
        </div>
        <div className="stat">
          <div className="stat-value">
            {formatYtdHours(payload.downtimeYtdHours)}
          </div>
          <div className="stat-label">с начала года</div>
        </div>
      </div>

      <div className="card card-inset">
        <div className="section-title">{LABELS.tempStorage}</div>
        <LineList items={vhItems} className="muted" />
        {payload.vhSummary.totalBatches > 0 ? (
          <div className="muted" style={{ marginTop: 8, fontSize: "0.85rem" }}>
            из {payload.vhSummary.totalBatches} партий на ВХ
          </div>
        ) : null}
      </div>

      <div className="card card-inset">
        <div className="section-title">{LABELS.shiftOps}</div>
        <LineList items={shiftItems} className="muted" />
      </div>

      <div className="card card-inset">
        <div className="section-title">{LABELS.nshsTp}</div>
        <div className="muted">{nshsText}</div>
      </div>
    </div>
  );
}