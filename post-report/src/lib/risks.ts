import { LABELS } from "./labels";
import type { ReportPayload } from "./types";

export type RiskItem = {
  kind: "vh" | "downtime" | "operation" | "nshs";
  title: string;
  detail: string;
};

export function deriveRisks(
  payload: ReportPayload,
  todayIso: string,
): RiskItem[] {
  const risks: RiskItem[] = [];
  for (const row of payload.vhRows) {
    if (row.expiresAt && row.expiresAt < todayIso) {
      risks.push({
        kind: "vh",
        title: "ВХ",
        detail: `${row.vessel} — срок ВХ до ${row.expiresAt}`,
      });
    }
  }
  for (const d of payload.downtime) {
    risks.push({
      kind: "downtime",
      title: "Простой",
      detail: `${d.reason} ${d.startedAt}–${d.endedAt}`,
    });
  }
  for (const op of payload.berthOperations) {
    if (/нач/i.test(op.status)) {
      risks.push({
        kind: "operation",
        title: "Операция",
        detail: `${op.vessel} — ${op.kind}, статус: начата`,
      });
    }
  }
  if (payload.nshsTp.present) {
    risks.push({
      kind: "nshs",
      title: LABELS.nshsTp,
      detail:
        payload.nshsTp.description || LABELS.nshsTpFull,
    });
  }
  return risks;
}