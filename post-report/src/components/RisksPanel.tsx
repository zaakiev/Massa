import { deriveRisks, type RiskItem } from "@/lib/risks";
import type { ReportPayload } from "@/lib/types";

function pillClass(kind: RiskItem["kind"]): string {
  switch (kind) {
    case "vh":
    case "downtime":
      return "pill pill-warn";
    case "nshs":
      return "pill pill-info";
    default:
      return "pill pill-info";
  }
}

export function RisksPanel({
  payload,
  reportDate,
}: {
  payload: ReportPayload;
  reportDate: string;
}) {
  const risks = deriveRisks(payload, reportDate);

  if (risks.length === 0) {
    return (
      <div className="card card-inset">
        <span className="pill pill-ok">без рисков</span>
        <div className="muted" style={{ marginTop: 8 }}>
          За смену риски не выявлены
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      {risks.map((risk, i) => (
        <div className="card card-inset" key={`${risk.kind}-${i}`}>
          <span className={pillClass(risk.kind)}>{risk.title}</span>
          <div style={{ marginTop: 6, fontSize: "0.85rem" }}>{risk.detail}</div>
        </div>
      ))}
    </div>
  );
}