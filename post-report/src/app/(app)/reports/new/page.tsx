import Link from "next/link";
import { NewReportClient } from "@/components/NewReportClient";

export default function NewReportPage() {
  return (
    <>
      <div
        className="row between app-header"
        style={{ padding: "10px 14px", display: "flex" }}
      >
        <Link href="/" className="muted" style={{ fontSize: "0.85rem" }}>
          ← Назад
        </Link>
        <span>Загрузка</span>
        <span style={{ width: 48 }} />
      </div>
      <NewReportClient />
    </>
  );
}