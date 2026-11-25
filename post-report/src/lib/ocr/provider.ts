import { readFileSync } from "node:fs";
import path from "node:path";
import { LABELS } from "../labels";
import { parseReportFromOcrText } from "../parse/reportParser";
import type { ReportPayload } from "../types";

export interface OcrProvider {
  extractText(images: Buffer[]): Promise<string>;
}

export function getOcrProvider(): OcrProvider {
  const mode = process.env.OCR_PROVIDER ?? "fixture";
  if (mode === "openai") return createOpenAiProvider();
  return createFixtureProvider();
}

function fixtureTextPath(): string {
  return path.join(process.cwd(), "fixtures/sample-ocr.txt");
}

function createFixtureProvider(): OcrProvider {
  return {
    async extractText(_images: Buffer[]): Promise<string> {
      return readFileSync(fixtureTextPath(), "utf8");
    },
  };
}

function createOpenAiProvider(): OcrProvider {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY is required when OCR_PROVIDER=openai",
    );
  }
  return {
    async extractText(_images: Buffer[]): Promise<string> {
      throw new Error("OpenAI vision OCR is not implemented in v1");
    },
  };
}

export function warningsForEmptySections(payload: ReportPayload): string[] {
  const warnings: string[] = [];

  if (!payload.reportDate) {
    warnings.push("Дата отчёта: не распознана");
  }
  if (!payload.asOfTime) {
    warnings.push("Время «на момент»: не распознано");
  }
  if (payload.roadstead.length === 0) {
    warnings.push("Суда на рейде: нет данных");
  }
  if (payload.waitingDeparture.length === 0) {
    warnings.push("Суда в ожидании убытия: нет данных");
  }
  if (payload.downtime.length === 0) {
    warnings.push("Простой: нет данных");
  }
  if (payload.vhRows.length === 0 && payload.vhSummary.totalBatches === 0) {
    warnings.push(`${LABELS.tempStorage}: нет данных`);
  }
  if (payload.pdtRows.length === 0) {
    warnings.push(`${LABELS.pdt}: нет данных`);
  }
  if (payload.berthOperations.length === 0) {
    warnings.push("Операции причала: нет данных");
  }
  if (payload.otherGoodsPztk.length === 0) {
    warnings.push(`${LABELS.otherGoodsPztk}: нет данных`);
  }

  return warnings;
}

export async function recognizeImages(
  files: Buffer[],
): Promise<{ text: string; payload: ReportPayload; warnings: string[] }> {
  if (files.length === 0) {
    throw new Error("at least one image is required");
  }
  const provider = getOcrProvider();
  const text = await provider.extractText(files);
  const payload = parseReportFromOcrText(text);
  const warnings = warningsForEmptySections(payload);
  return { text, payload, warnings };
}