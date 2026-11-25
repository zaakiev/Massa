import { LABELS } from "@/lib/labels";
import type { ReportPayload } from "@/lib/types";

function formatTons(tons: number | null): string {
  if (tons === null) return "";
  return `${tons} ${LABELS.tons}`;
}

function formatOtherGoods(row: ReportPayload["otherGoodsPztk"][number]): string {
  const parts = [row.name];
  if (row.volumeM3 !== null) {
    parts.push(`${row.volumeM3} ${LABELS.cubicMeters}`);
  }
  if (row.tons !== null) {
    parts.push(`${row.tons} ${LABELS.tons}`);
  }
  if (row.bigBags !== null) {
    parts.push(`${row.bigBags} биг-бэгов`);
  }
  return parts.join(" · ");
}

export function TablesPanel({ payload }: { payload: ReportPayload }) {
  return (
    <div className="stack">
      <div className="section-title">Суда на рейде</div>
      {payload.roadstead.length === 0 ? (
        <div className="muted">Нет данных</div>
      ) : (
        payload.roadstead.map((v, i) => (
          <div className="line-item" key={`road-${i}`}>
            <strong className="line-item-title">{v.name}</strong>
            <div className="muted">
              {[v.goods, formatTons(v.tons)].filter(Boolean).join(" · ") ||
                "без груза"}
            </div>
          </div>
        ))
      )}

      <div className="section-title">Ожидание убытия</div>
      {payload.waitingDeparture.length === 0 ? (
        <div className="muted">Нет данных</div>
      ) : (
        payload.waitingDeparture.map((v, i) => (
          <div className="line-item" key={`wait-${i}`}>
            <strong className="line-item-title">{v.name}</strong>
            <div className="muted">
              {[v.country, v.goods, formatTons(v.tons)]
                .filter(Boolean)
                .join(" · ")}
            </div>
          </div>
        ))
      )}

      <div className="section-title">{LABELS.otherGoodsPztk}</div>
      {payload.otherGoodsPztk.length === 0 ? (
        <div className="muted">Нет данных</div>
      ) : (
        payload.otherGoodsPztk.map((row, i) => (
          <div className="card card-inset" key={`other-${i}`}>
            <div style={{ fontSize: "0.85rem" }}>{formatOtherGoods(row)}</div>
            {row.dtNumbers.length > 0 ? (
              <div className="muted">
                {row.dtNumbers.map((dt) => `ДТ №${dt}`).join(", ")}
              </div>
            ) : null}
          </div>
        ))
      )}
    </div>
  );
}