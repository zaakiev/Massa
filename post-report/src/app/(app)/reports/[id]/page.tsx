import Link from "next/link";
import { notFound } from "next/navigation";
import { ReportCardClient } from "@/components/ReportCardClient";
import { getReport } from "@/lib/reports";

type Params = { params: Promise<{ id: string }> };

export default async function ReportCardPage({ params }: Params) {
  const { id: rawId } = await params;
  const id = Number.parseInt(rawId, 10);
  if (!Number.isFinite(id) || id < 1) {
    notFound();
  }

  const report = await getReport(id);
  if (!report) {
    notFound();
  }

  return (
    <>
      <div
        className="row between app-header"
        style={{ padding: "10px 14px", display: "flex" }}
      >
        <Link href="/" className="muted" style={{ fontSize: "0.85rem" }}>
          ← Назад
        </Link>
        <span>Отчёт</span>
        <span style={{ width: 48 }} />
      </div>
      <ReportCardClient
        reportDate={report.report_date}
        shiftNo={report.shift_no}
        officerName={report.officer_name}
        photoCount={report.photos.length}
        payload={report.payload}
      />
    </>
  );
}