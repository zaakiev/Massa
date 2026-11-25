import type {
  OtherGoodsPztk,
  ReportPayload,
  RoadsteadVessel,
  ShiftOps,
  VhSummary,
} from "../types";

const GOODS_NAME_ALIASES: Record<string, string> = {
  "порошок стир.": "порошок стиральный",
  "порошок стир": "порошок стиральный",
  "образцы цем.": "образцы цемента",
  "образцы цем": "образцы цемента",
};

function normalizeGoodsName(raw: string): string {
  const key = raw.trim().toLowerCase();
  return GOODS_NAME_ALIASES[key] ?? raw.trim();
}

function parseCommaNumber(value: string): number {
  return Number.parseFloat(value.replace(/\s/g, "").replace(",", "."));
}

function emptyShiftOps(): ShiftOps {
  return {
    do1: 0,
    do2: 0,
    customsWatch: 0,
    dtImport: 0,
    dtExport: 0,
    pdtCumulative: 0,
  };
}

function emptyVhSummary(): VhSummary {
  return { totalBatches: 0, byGoods: [], releasedDt: 0 };
}

function basePayload(): ReportPayload {
  return {
    reportDate: "",
    asOfTime: "",
    roadstead: [],
    waitingDeparture: [],
    downtime: [],
    downtimeYtdHours: null,
    downtimeYtdDays: null,
    vhRows: [],
    vhSummary: emptyVhSummary(),
    pdtRows: [],
    berthOperations: [],
    shiftOps: emptyShiftOps(),
    otherGoodsPztk: [],
    nshsTp: { present: false, description: "" },
  };
}

function parseVhSummaryLine(line: string, summary: VhSummary): void {
  const totalMatch = line.match(/партий-(\d+)/i);
  if (totalMatch) {
    summary.totalBatches = Number.parseInt(totalMatch[1], 10);
  }

  const releasedMatch = line.match(/Вып_ДТ\s*-\s*(\d+)/i);
  if (releasedMatch) {
    summary.releasedDt = Number.parseInt(releasedMatch[1], 10);
  }

  const goodsBlock = line.match(/из них\s+(.+?)(?:;\s*Вып_ДТ\b|$)/i);
  if (!goodsBlock) {
    return;
  }

  for (const segment of goodsBlock[1].split(";")) {
    const trimmed = segment.trim();
    const itemMatch = trimmed.match(/^(.+)-(\d+)\s*$/);
    if (!itemMatch) {
      continue;
    }
    summary.byGoods.push({
      name: normalizeGoodsName(itemMatch[1]),
      count: Number.parseInt(itemMatch[2], 10),
    });
  }
}

function parseShiftOpsLine(line: string, shiftOps: ShiftOps): void {
  const pick = (re: RegExp): number | undefined => {
    const m = line.match(re);
    return m ? Number.parseInt(m[1], 10) : undefined;
  };

  const do1 = pick(/ДО1\s*-\s*(\d+)/i);
  const do2 = pick(/ДО2\s*-\s*(\d+)/i);
  const tn = pick(/ТН-?\s*(\d+)/i);
  const dtIm = pick(/ДТ-ИМ\s*-\s*(\d+)/i);
  const ek = pick(/ЭК\s*-\s*(\d+)/i);

  if (do1 !== undefined) shiftOps.do1 = do1;
  if (do2 !== undefined) shiftOps.do2 = do2;
  if (tn !== undefined) shiftOps.customsWatch = tn;
  if (dtIm !== undefined) shiftOps.dtImport = dtIm;
  if (ek !== undefined) shiftOps.dtExport = ek;
}

function parseRoadsteadLine(line: string): RoadsteadVessel | null {
  const m = line.match(
    /^(.+?)\s+(Иран(?:\s+\d{2}\.\d{2}\.\d{4})?)\s+(\S+)\s+([\d,]+)\s*$/,
  );
  if (!m) {
    return null;
  }
  return {
    name: m[1].trim(),
    countryDate: m[2].trim(),
    goods: m[3].trim(),
    tons: parseCommaNumber(m[4]),
  };
}

function parseOtherGoodsLine(line: string): OtherGoodsPztk | null {
  const lumber = line.match(
    /^(Лесоматериалы?)\s+объем\s*-\s*([\d,]+)\s*м3\s+вес\s*-\s*([\d,]+)\s+ДТ\s*№?\s*([\d/]+)/i,
  );
  if (lumber) {
    return {
      name: lumber[1],
      volumeM3: parseCommaNumber(lumber[2]),
      tons: parseCommaNumber(lumber[3]),
      bigBags: null,
      dtNumbers: [lumber[4]],
    };
  }

  const bigBag = line.match(/^(.+?)\s+(\d+)\s+Б\/Б\s*$/i);
  if (bigBag) {
    return {
      name: bigBag[1].trim(),
      volumeM3: null,
      tons: null,
      bigBags: Number.parseInt(bigBag[2], 10),
      dtNumbers: [],
    };
  }

  return null;
}

function linesBetween(
  lines: string[],
  startHeader: RegExp,
  endHeader: RegExp,
): string[] {
  const start = lines.findIndex((l) => startHeader.test(l));
  if (start < 0) {
    return [];
  }
  const body: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (endHeader.test(lines[i])) {
      break;
    }
    body.push(lines[i]);
  }
  return body;
}

export function parseReportFromOcrText(text: string): ReportPayload {
  const payload = basePayload();
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  for (const line of lines) {
    if (/Всего тов партий/i.test(line)) {
      parseVhSummaryLine(line, payload.vhSummary);
    }
    if (/ДО1/i.test(line) && /ДО2/i.test(line)) {
      parseShiftOpsLine(line, payload.shiftOps);
    }
    if (/ПДТ\s+с\s+начала\s+года/i.test(line)) {
      const m = line.match(/(\d+)\s*$/);
      if (m) {
        payload.shiftOps.pdtCumulative = Number.parseInt(m[1], 10);
      }
    }
  }

  for (const line of linesBetween(lines, /Суда на рейде/i, /Иные товары/i)) {
    const vessel = parseRoadsteadLine(line);
    if (vessel) {
      payload.roadstead.push(vessel);
    }
  }

  const otherGoodsStart = lines.findIndex((l) => /Иные товары/i.test(l));
  if (otherGoodsStart >= 0) {
    for (let i = otherGoodsStart + 1; i < lines.length; i++) {
      const item = parseOtherGoodsLine(lines[i]);
      if (item) {
        payload.otherGoodsPztk.push(item);
      }
    }
  }

  return payload;
}