"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LABELS } from "@/lib/labels";
import type { ReportPayload } from "@/lib/types";

type Shift = { id: number; shift_no: number };
type Officer = { id: number; full_name: string };

function emptyPayload(): ReportPayload {
  return {
    reportDate: new Date().toISOString().slice(0, 10),
    asOfTime: "",
    roadstead: [],
    waitingDeparture: [],
    downtime: [],
    downtimeYtdHours: null,
    downtimeYtdDays: null,
    vhRows: [],
    vhSummary: { totalBatches: 0, byGoods: [], releasedDt: 0 },
    pdtRows: [],
    berthOperations: [],
    shiftOps: {
      do1: 0,
      do2: 0,
      customsWatch: 0,
      dtImport: 0,
      dtExport: 0,
      pdtCumulative: 0,
    },
    otherGoodsPztk: [],
    nshsTp: { present: false, description: "" },
  };
}

export function NewReportClient() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [shiftNo, setShiftNo] = useState<number | null>(null);
  const [officerName, setOfficerName] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [payload, setPayload] = useState<ReportPayload | null>(null);
  const [reportDate, setReportDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [loadingDirs, setLoadingDirs] = useState(true);
  const [recognizing, setRecognizing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [sRes, oRes] = await Promise.all([
          fetch("/api/shifts"),
          fetch("/api/officers"),
        ]);
        if (!sRes.ok || !oRes.ok) {
          if (!cancelled) setError("Не удалось загрузить справочники");
          return;
        }
        const sData = (await sRes.json()) as { shifts: Shift[] };
        const oData = (await oRes.json()) as { officers: Officer[] };
        if (cancelled) return;
        setShifts(sData.shifts);
        setOfficers(oData.officers);
        if (sData.shifts.length > 0) {
          setShiftNo(sData.shifts[0].shift_no);
        }
        if (oData.officers.length > 0) {
          setOfficerName(oData.officers[0].full_name);
        }
      } catch {
        if (!cancelled) setError("Ошибка сети");
      } finally {
        if (!cancelled) setLoadingDirs(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function onFilesChange(list: FileList | null) {
    if (!list) return;
    setFiles(Array.from(list));
  }

  async function onRecognize() {
    setError("");
    setWarnings([]);
    if (files.length === 0) {
      setError("Добавьте хотя бы одно фото");
      return;
    }
    setRecognizing(true);
    try {
      const form = new FormData();
      for (const f of files) {
        form.append("photos", f);
      }
      const res = await fetch("/api/recognize", { method: "POST", body: form });
      const data = (await res.json()) as {
        payload?: ReportPayload;
        warnings?: string[];
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Ошибка распознавания");
        return;
      }
      const next = data.payload ?? emptyPayload();
      setPayload(next);
      if (next.reportDate) setReportDate(next.reportDate);
      setWarnings(data.warnings ?? []);
    } catch {
      setError("Ошибка сети");
    } finally {
      setRecognizing(false);
    }
  }

  function updateShiftOps(field: keyof ReportPayload["shiftOps"], value: string) {
    const n = Number.parseInt(value, 10);
    const num = Number.isFinite(n) ? n : 0;
    setPayload((prev) => {
      const base = prev ?? emptyPayload();
      return {
        ...base,
        shiftOps: { ...base.shiftOps, [field]: num },
      };
    });
  }

  function updateVhSummary(
    field: "totalBatches" | "releasedDt",
    value: string,
  ) {
    const n = Number.parseInt(value, 10);
    const num = Number.isFinite(n) ? n : 0;
    setPayload((prev) => {
      const base = prev ?? emptyPayload();
      return {
        ...base,
        vhSummary: { ...base.vhSummary, [field]: num },
      };
    });
  }

  async function onSave() {
    setError("");
    if (shiftNo === null || !officerName) {
      setError("Выберите смену и фамилию");
      return;
    }
    const bodyPayload = payload ?? emptyPayload();
    bodyPayload.reportDate = reportDate;

    setSaving(true);
    try {
      const form = new FormData();
      form.append("report_date", reportDate);
      form.append("shift_no", String(shiftNo));
      form.append("officer_name", officerName);
      form.append("payload", JSON.stringify(bodyPayload));
      for (const f of files) {
        form.append("photos", f);
      }

      const res = await fetch("/api/reports", { method: "POST", body: form });
      const data = (await res.json()) as { id?: number; error?: string };
      if (!res.ok || data.id === undefined) {
        setError(data.error ?? "Не удалось сохранить");
        return;
      }
      router.push(`/reports/${data.id}`);
      router.refresh();
    } catch {
      setError("Ошибка сети");
    } finally {
      setSaving(false);
    }
  }

  const editing = payload !== null;
  const shiftPills =
    shifts.length > 0
      ? shifts.map((s) => s.shift_no)
      : [1, 2, 3, 4];

  return (
    <div className="stack">
      <h3 className="screen-h">Новый отчёт</h3>

      {loadingDirs ? <div className="muted">Загрузка…</div> : null}

      <div>
        <div className="muted">Смена</div>
        <div className="row" style={{ marginTop: 6, gap: 6, flexWrap: "wrap" }}>
          {shiftPills.map((no) => (
            <button
              key={no}
              type="button"
              className={`pill${shiftNo === no ? " on" : ""}`}
              onClick={() => setShiftNo(no)}
            >
              {no}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="muted">Фамилия</div>
        <select
          className="select"
          style={{ marginTop: 6 }}
          value={officerName}
          onChange={(e) => setOfficerName(e.target.value)}
        >
          {officers.length === 0 ? (
            <option value="">— нет в справочнике —</option>
          ) : (
            officers.map((o) => (
              <option key={o.id} value={o.full_name}>
                {o.full_name}
              </option>
            ))
          )}
        </select>
      </div>

      <div>
        <div className="muted">Дата отчёта</div>
        <input
          type="date"
          className="input"
          style={{ marginTop: 6 }}
          value={reportDate}
          onChange={(e) => setReportDate(e.target.value)}
        />
      </div>

      <button
        type="button"
        className="camera"
        onClick={() => fileRef.current?.click()}
      >
        <strong>Камера</strong>
        <span className="muted">
          Страница 1 — суточный · страница 2 — ВХ и ПЗТК
        </span>
        <span className="muted">
          {files.length > 0
            ? `${files.length} фото выбрано`
            : "Нажмите, чтобы сделать снимок"}
        </span>
      </button>
      <input
        ref={fileRef}
        className="hidden-input"
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        onChange={(e) => onFilesChange(e.target.files)}
      />

      {files.length > 0 ? (
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          {files.map((f, i) => (
            <span key={`${f.name}-${i}`} className="pill">
              фото {i + 1}
            </span>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        className="btn primary"
        disabled={recognizing || files.length === 0}
        onClick={() => void onRecognize()}
      >
        {recognizing ? "Распознаём…" : "Распознать"}
      </button>

      {warnings.length > 0 ? (
        <div className="muted">
          {warnings.map((w, i) => (
            <div key={i}>{w}</div>
          ))}
        </div>
      ) : null}

      {editing && payload ? (
        <>
          <div className="section-title">{LABELS.shiftOps}</div>
          <div className="field-grid">
            <label>
              {LABELS.do1}
              <input
                type="number"
                className="input"
                value={payload.shiftOps.do1}
                onChange={(e) => updateShiftOps("do1", e.target.value)}
              />
            </label>
            <label>
              {LABELS.do2}
              <input
                type="number"
                className="input"
                value={payload.shiftOps.do2}
                onChange={(e) => updateShiftOps("do2", e.target.value)}
              />
            </label>
            <label>
              {LABELS.customsWatch}
              <input
                type="number"
                className="input"
                value={payload.shiftOps.customsWatch}
                onChange={(e) => updateShiftOps("customsWatch", e.target.value)}
              />
            </label>
            <label>
              {LABELS.dtImport}
              <input
                type="number"
                className="input"
                value={payload.shiftOps.dtImport}
                onChange={(e) => updateShiftOps("dtImport", e.target.value)}
              />
            </label>
            <label>
              {LABELS.dtExport}
              <input
                type="number"
                className="input"
                value={payload.shiftOps.dtExport}
                onChange={(e) => updateShiftOps("dtExport", e.target.value)}
              />
            </label>
            <label>
              ПДТ (нарастающим)
              <input
                type="number"
                className="input"
                value={payload.shiftOps.pdtCumulative}
                onChange={(e) =>
                  updateShiftOps("pdtCumulative", e.target.value)
                }
              />
            </label>
          </div>

          <div className="section-title" style={{ marginTop: 12 }}>
            {LABELS.tempStorage}
          </div>
          <div className="field-grid">
            <label>
              Всего партий
              <input
                type="number"
                className="input"
                value={payload.vhSummary.totalBatches}
                onChange={(e) => updateVhSummary("totalBatches", e.target.value)}
              />
            </label>
            <label>
              {LABELS.releasedDt}
              <input
                type="number"
                className="input"
                value={payload.vhSummary.releasedDt}
                onChange={(e) => updateVhSummary("releasedDt", e.target.value)}
              />
            </label>
          </div>

          <label className="muted" style={{ display: "block", marginTop: 12 }}>
            {LABELS.nshsTp}
            <textarea
              className="textarea"
              style={{ marginTop: 4 }}
              value={payload.nshsTp.description}
              onChange={(e) =>
                setPayload({
                  ...payload,
                  nshsTp: {
                    ...payload.nshsTp,
                    description: e.target.value,
                    present: e.target.value.trim().length > 0,
                  },
                })
              }
              placeholder="Описание, если было"
            />
          </label>

          <button
            type="button"
            className="btn primary"
            style={{ marginTop: 12 }}
            disabled={saving}
            onClick={() => void onSave()}
          >
            {saving ? "Сохранение…" : "Сохранить отчёт"}
          </button>
        </>
      ) : (
        <button
          type="button"
          className="btn secondary"
          disabled={saving || shiftNo === null}
          onClick={() => void onSave()}
        >
          Сохранить без OCR
        </button>
      )}

      {error ? (
        <p role="alert" style={{ color: "#ff9b9b", fontSize: "0.85rem" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}