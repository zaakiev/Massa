# Post Report PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an iPhone PWA that accepts photos of the Makhachkala customs post daily forms, OCR-parses them into structured reports, and shows summary / tables / risks / archive stats for a shared post database.

**Architecture:** Next.js App Router app in `post-report/` with server API routes, Postgres when `DATABASE_URL` is set (PGlite locally), file uploads on disk/`uploads/`, pluggable OCR provider (fixture for tests, vision API when key present), and a mobile-first UI matching the agreed label canon.

**Tech Stack:** Next.js 15 (App Router), TypeScript, React, `pg` + `@electric-sql/pglite`, Vitest, `bcryptjs` for post code hash, optional OCR via env `OCR_PROVIDER` (`fixture` | `openai`).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-11-26-post-report-pwa-design.md`
- UI labels exactly: `Выпущено ДТ`, `Иные товары на ПЗТК`, `ПДТ`, `ДО1`, `ДО2`, `Таможенное наблюдение (ТН)`, `ДТ ИМПОРТ`, `ДТ ЭКСПОРТ`, `НШС (ТП)`, `м³`, `т` in tables
- VH goods and shift ops lists: one item per line (no `·` / `;` joiners in those lists)
- No underscores in UI copy (`Вып_ДТ` forbidden)
- Access: single post access code; upload tags shift number + surname from directory
- Shared DB for all sessions with the same post code
- App lives under `post-report/` (do not break existing Massa root scripts)
- Local DB: always `env -u DATABASE_URL` when developing on this VM unless intentionally using app Postgres

---

## File map

| Path | Responsibility |
| --- | --- |
| `post-report/package.json` | App dependencies and scripts |
| `post-report/cursor-app.json` | Declare `{ "database": "postgres" }` for publish-app |
| `post-report/migrations/001_init.sql` | Schema |
| `post-report/src/lib/db.ts` | `sql()` helper (pg / PGlite) |
| `post-report/src/lib/labels.ts` | Canon UI strings |
| `post-report/src/lib/types.ts` | `ReportPayload` and related types |
| `post-report/src/lib/risks.ts` | Risk derivation from payload |
| `post-report/src/lib/parse/reportParser.ts` | Text/OCR → `ReportPayload` |
| `post-report/src/lib/ocr/provider.ts` | OCR interface + fixture/openai |
| `post-report/src/lib/auth.ts` | Post-code cookie session |
| `post-report/src/lib/stats.ts` | Period aggregates |
| `post-report/src/app/**` | Pages and API routes |
| `post-report/tests/**` | Vitest unit tests |
| `post-report/fixtures/sample-ocr.txt` | OCR text fixture from sample forms |

---

### Task 1: Scaffold app + label canon + types

**Files:**
- Create: `post-report/package.json`
- Create: `post-report/tsconfig.json`
- Create: `post-report/next.config.ts`
- Create: `post-report/vitest.config.ts`
- Create: `post-report/cursor-app.json`
- Create: `post-report/src/lib/labels.ts`
- Create: `post-report/src/lib/types.ts`
- Create: `post-report/tests/labels.test.ts`
- Create: `post-report/src/app/layout.tsx`
- Create: `post-report/src/app/page.tsx`
- Create: `post-report/src/app/globals.css`

**Interfaces:**
- Produces: `LABELS` object; `ReportPayload` type used by all later tasks

- [ ] **Step 1: Create `post-report` Next.js package**

```bash
cd /agent/repos/Massa
mkdir -p post-report
cd post-report
npm init -y
npm install next@15 react@19 react-dom@19 bcryptjs zod
npm install -D typescript @types/node @types/react @types/react-dom @types/bcryptjs vitest
```

`package.json` scripts:

```json
{
  "scripts": {
    "dev": "env -u DATABASE_URL next dev -p 3000",
    "build": "next build && node scripts/migrate.mjs",
    "start": "next start -p 3000",
    "test": "vitest run",
    "migrate": "node scripts/migrate.mjs"
  }
}
```

`cursor-app.json`:

```json
{ "database": "postgres" }
```

`next.config.ts`:

```ts
import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite"],
};
export default nextConfig;
```

- [ ] **Step 2: Write failing label test**

```ts
// post-report/tests/labels.test.ts
import { describe, expect, it } from "vitest";
import { LABELS } from "../src/lib/labels";

describe("LABELS canon", () => {
  it("uses agreed Russian captions without underscores", () => {
    expect(LABELS.releasedDt).toBe("Выпущено ДТ");
    expect(LABELS.otherGoodsPztk).toBe("Иные товары на ПЗТК");
    expect(LABELS.pdt).toBe("ПДТ");
    expect(LABELS.do1).toBe("ДО1");
    expect(LABELS.do2).toBe("ДО2");
    expect(LABELS.customsWatch).toBe("Таможенное наблюдение (ТН)");
    expect(LABELS.dtImport).toBe("ДТ ИМПОРТ");
    expect(LABELS.dtExport).toBe("ДТ ЭКСПОРТ");
    expect(LABELS.nshsTp).toBe("НШС (ТП)");
    expect(LABELS.nshsTpFull).toBe(
      "нештатная ситуация уровня таможенного поста",
    );
    expect(LABELS.cubicMeters).toBe("м³");
    expect(LABELS.tons).toBe("т");
    for (const v of Object.values(LABELS)) {
      expect(v).not.toMatch(/_/);
    }
  });
});
```

- [ ] **Step 3: Run test — expect fail**

Run: `cd post-report && npm test -- tests/labels.test.ts`  
Expected: FAIL module not found

- [ ] **Step 4: Implement labels + types + minimal app shell**

```ts
// post-report/src/lib/labels.ts
export const LABELS = {
  releasedDt: "Выпущено ДТ",
  otherGoodsPztk: "Иные товары на ПЗТК",
  pdt: "ПДТ",
  do1: "ДО1",
  do2: "ДО2",
  customsWatch: "Таможенное наблюдение (ТН)",
  dtImport: "ДТ ИМПОРТ",
  dtExport: "ДТ ЭКСПОРТ",
  nshsTp: "НШС (ТП)",
  nshsTpFull: "нештатная ситуация уровня таможенного поста",
  cubicMeters: "м³",
  tons: "т",
  tempStorage: "Временное хранение (ВХ)",
  shiftOps: "Операции смены",
} as const;
```

```ts
// post-report/src/lib/types.ts
export type RoadsteadVessel = {
  name: string;
  countryDate: string;
  goods: string;
  tons: number | null;
};

export type WaitingDepartureVessel = {
  name: string;
  country: string;
  goods: string;
  tons: number | null;
};

export type DowntimeRow = {
  reason: string;
  startedAt: string;
  endedAt: string;
};

export type VhBatch = {
  vessel: string;
  berth: string;
  do1: string;
  statusOnVh: string;
  expiresAt: string;
  goods: string;
  tons: number | null;
  places: number | null;
  goodsStatus: string;
  orderNo: string;
  removedPlaces: number | null;
  remainingPlaces: number | null;
};

export type VhSummary = {
  totalBatches: number;
  byGoods: { name: string; count: number }[];
  releasedDt: number;
};

export type ShiftOps = {
  do1: number;
  do2: number;
  customsWatch: number;
  dtImport: number;
  dtExport: number;
  pdtCumulative: number;
};

export type OtherGoodsPztk = {
  name: string;
  volumeM3: number | null;
  tons: number | null;
  bigBags: number | null;
  dtNumbers: string[];
};

export type BerthOperation = {
  kind: string;
  vessel: string;
  berth: string;
  startedAt: string;
  endedAt: string;
  goods: string;
  quantity: string;
  status: string;
};

export type ReportPayload = {
  reportDate: string;
  asOfTime: string;
  roadstead: RoadsteadVessel[];
  waitingDeparture: WaitingDepartureVessel[];
  downtime: DowntimeRow[];
  downtimeYtdHours: number | null;
  downtimeYtdDays: number | null;
  vhRows: VhBatch[];
  vhSummary: VhSummary;
  pdtRows: {
    vessel: string;
    berth: string;
    placedAt: string;
    goods: string;
    tons: number | null;
    places: number | null;
    orderNo: string;
    removedPlaces: number | null;
    remaining: number | null;
  }[];
  berthOperations: BerthOperation[];
  shiftOps: ShiftOps;
  otherGoodsPztk: OtherGoodsPztk[];
  nshsTp: { present: boolean; description: string };
};
```

Minimal `layout.tsx` / `page.tsx` redirect placeholder to `/login` later; for now render “Post Report”.

- [ ] **Step 5: Run test — expect pass**

Run: `cd post-report && npm test -- tests/labels.test.ts`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add post-report
git commit -m "feat(post-report): scaffold Next app with label canon and types"
```

---

### Task 2: Database schema + `sql()` helper

**Files:**
- Create: `post-report/migrations/001_init.sql`
- Create: `post-report/src/lib/db.ts`
- Create: `post-report/scripts/migrate.mjs`
- Create: `post-report/tests/db.test.ts`
- Modify: `post-report/package.json` (add `pg`, `@electric-sql/pglite`)

**Interfaces:**
- Produces: `sql<T>(text, params?)` used by auth/reports/settings APIs

- [ ] **Step 1: Install DB deps**

```bash
cd post-report
npm install pg @electric-sql/pglite
```

- [ ] **Step 2: Write migration**

```sql
-- post-report/migrations/001_init.sql
CREATE TABLE IF NOT EXISTS post_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  code_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS officers (
  id SERIAL PRIMARY KEY,
  full_name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS shifts (
  id SERIAL PRIMARY KEY,
  shift_no INTEGER NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS reports (
  id SERIAL PRIMARY KEY,
  report_date DATE NOT NULL,
  shift_no INTEGER NOT NULL,
  officer_name TEXT NOT NULL,
  payload JSONB NOT NULL,
  has_risks BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS report_photos (
  id SERIAL PRIMARY KEY,
  report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  page_no INTEGER NOT NULL,
  file_path TEXT NOT NULL
);
```

- [ ] **Step 3: Implement `db.ts` and `scripts/migrate.mjs`** exactly as in apps-database skill (`sql()` with pg Pool / PGlite + migrate script applying `migrations/*.sql`).

- [ ] **Step 4: Test insert/select with PGlite**

```ts
// post-report/tests/db.test.ts
import { describe, expect, it } from "vitest";
import { sql } from "../src/lib/db";

describe("sql helper", () => {
  it("inserts and reads officers", async () => {
    await sql(`DELETE FROM officers`);
    await sql(`INSERT INTO officers (full_name) VALUES ($1)`, ["Иванов"]);
    const rows = await sql<{ full_name: string }>(
      `SELECT full_name FROM officers`,
    );
    expect(rows.map((r) => r.full_name)).toEqual(["Иванов"]);
  });
});
```

Run: `cd post-report && env -u DATABASE_URL npm test -- tests/db.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add post-report/migrations post-report/src/lib/db.ts post-report/scripts post-report/tests/db.test.ts post-report/package.json post-report/package-lock.json
git commit -m "feat(post-report): add Postgres/PGlite schema and sql helper"
```

---

### Task 3: Post-code auth session

**Files:**
- Create: `post-report/src/lib/auth.ts`
- Create: `post-report/src/app/api/auth/login/route.ts`
- Create: `post-report/src/app/api/auth/logout/route.ts`
- Create: `post-report/src/app/login/page.tsx`
- Create: `post-report/tests/auth.test.ts`
- Create: `post-report/scripts/seed-dev.mjs` (default code `posta` hashed into `post_settings` for local)

**Interfaces:**
- Produces: `verifyPostCode(code)`, `requireSession()`, cookie name `post_session`
- Consumes: `sql`, `bcryptjs`

- [ ] **Step 1: Failing test for code verify**

```ts
import { describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { sql } from "../src/lib/db";
import { verifyPostCode } from "../src/lib/auth";

describe("verifyPostCode", () => {
  it("accepts matching code", async () => {
    const hash = await bcrypt.hash("posta", 10);
    await sql(`DELETE FROM post_settings`);
    await sql(
      `INSERT INTO post_settings (id, code_hash) VALUES (1, $1)`,
      [hash],
    );
    expect(await verifyPostCode("posta")).toBe(true);
    expect(await verifyPostCode("wrong")).toBe(false);
  });
});
```

- [ ] **Step 2: Implement auth**

```ts
// post-report/src/lib/auth.ts
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { sql } from "./db";

export const SESSION_COOKIE = "post_session";
const SESSION_VALUE = "ok";

export async function verifyPostCode(code: string): Promise<boolean> {
  const rows = await sql<{ code_hash: string }>(
    `SELECT code_hash FROM post_settings WHERE id = 1`,
  );
  if (rows.length === 0) return false;
  return bcrypt.compare(code, rows[0].code_hash);
}

export async function setSession(): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, SESSION_VALUE, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function requireSession(): Promise<boolean> {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value === SESSION_VALUE;
}
```

Login API: POST `{ code }` → verify → `setSession()` → `{ ok: true }` or 401.  
Logout: clear cookie.  
Login page: single password field + submit.

- [ ] **Step 3: Seed script + pass tests**

```js
// post-report/scripts/seed-dev.mjs
import bcrypt from "bcryptjs";
import { sql } from "../src/lib/db.ts"; // if TS import fails, duplicate hash insert via migrate SQL seed instead
```

Prefer seed SQL in `migrations/002_seed_dev.sql` only for local: document default code `posta` in README. For production, settings UI changes hash.

Simpler: `POST /api/auth/bootstrap` allowed only when `post_settings` empty — sets first code (used once).

- [ ] **Step 4: Commit**

```bash
git commit -am "feat(post-report): post access code login session"
```

---

### Task 4: Officers + shifts directories API

**Files:**
- Create: `post-report/src/app/api/officers/route.ts`
- Create: `post-report/src/app/api/shifts/route.ts`
- Create: `post-report/src/app/settings/page.tsx`
- Create: `post-report/tests/directories.test.ts`

**Interfaces:**
- Produces: `GET/POST /api/officers`, `GET/POST /api/shifts`, `DELETE` by id
- Consumes: `requireSession`, `sql`

- [ ] **Step 1: Tests for list/add officer and shift**

```ts
it("adds unique officer names", async () => {
  await sql(`DELETE FROM officers`);
  await sql(`INSERT INTO officers (full_name) VALUES ($1)`, ["Петров"]);
  const rows = await sql<{ full_name: string }>(
    `SELECT full_name FROM officers ORDER BY full_name`,
  );
  expect(rows).toEqual([{ full_name: "Петров" }]);
});
```

- [ ] **Step 2: Implement API routes** (reject if `!await requireSession()` with 401). Seed shifts 1–4 on first settings open if empty.

- [ ] **Step 3: Settings page UI** — lists + add forms; change post code form (bcrypt hash update).

- [ ] **Step 4: Commit**

```bash
git commit -am "feat(post-report): officers and shifts directories"
```

---

### Task 5: Parser + risks (pure domain)

**Files:**
- Create: `post-report/src/lib/parse/reportParser.ts`
- Create: `post-report/src/lib/risks.ts`
- Create: `post-report/fixtures/sample-ocr.txt`
- Create: `post-report/tests/reportParser.test.ts`
- Create: `post-report/tests/risks.test.ts`

**Interfaces:**
- Produces: `parseReportFromOcrText(text: string): ReportPayload`
- Produces: `deriveRisks(payload: ReportPayload, todayIso: string): RiskItem[]`
- Consumes: `ReportPayload`, `LABELS` (for risk titles only)

- [ ] **Step 1: Write fixture OCR text** covering VH summary line and shift ops from the 25.11.2026 samples, e.g. include:

```
Всего тов партий-16; из них цемент-11; порошок стир.-1; лампочки-1; штукатурка-1; клей плиточный-1; образцы цем.-1; Вып_ДТ - 8
ДО1 - 0; ДО2 - 5; ТН-1; ДТ-ИМ - 0; ЭК - 2
ПДТ с начала года по нарастающему 53
Суда на рейде
Сильвер Стар Иран цемент 2910,000
МАЛА Иран 04.11.2026 цемент 2906,802
Иные товары
Лесоматериалы объем - 587,25 м3 вес - 469,800 ДТ №10228020/230626/5128347
Калий хлористый 3036 Б/Б
```

- [ ] **Step 2: Failing parser tests**

```ts
import { readFileSync } from "node:fs";
import { parseReportFromOcrText } from "../src/lib/parse/reportParser";

it("parses VH summary and released DT", () => {
  const text = readFileSync("fixtures/sample-ocr.txt", "utf8");
  const p = parseReportFromOcrText(text);
  expect(p.vhSummary.totalBatches).toBe(16);
  expect(p.vhSummary.releasedDt).toBe(8);
  expect(p.vhSummary.byGoods).toEqual(
    expect.arrayContaining([
      { name: "цемент", count: 11 },
      { name: "порошок стиральный", count: 1 },
    ]),
  );
  expect(p.shiftOps).toMatchObject({
    do1: 0,
    do2: 5,
    customsWatch: 1,
    dtImport: 0,
    dtExport: 2,
    pdtCumulative: 53,
  });
  expect(p.otherGoodsPztk[0]?.name).toMatch(/Лесоматериал/i);
  expect(p.otherGoodsPztk[0]?.volumeM3).toBeCloseTo(587.25);
});
```

- [ ] **Step 3: Implement parser** — normalize OCR quirks (`Вып_ДТ`, `ТН`, `ЭК`, comma decimals) into `ReportPayload`. Map abbreviations internally; UI never shows underscore forms.

- [ ] **Step 4: Risks tests + implementation**

```ts
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
      title: "НШС (ТП)",
      detail: payload.nshsTp.description || "нештатная ситуация уровня таможенного поста",
    });
  }
  return risks;
}
```

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(post-report): OCR text parser and risk derivation"
```

---

### Task 6: OCR provider + recognize API

**Files:**
- Create: `post-report/src/lib/ocr/provider.ts`
- Create: `post-report/src/app/api/recognize/route.ts`
- Create: `post-report/tests/ocrProvider.test.ts`

**Interfaces:**
- Produces: `recognizeImages(files: Buffer[]): Promise<{ text: string; payload: ReportPayload; warnings: string[] }>`
- Env: `OCR_PROVIDER=fixture|openai`, `OPENAI_API_KEY` optional

- [ ] **Step 1: Provider interface**

```ts
export interface OcrProvider {
  extractText(images: Buffer[]): Promise<string>;
}

export function getOcrProvider(): OcrProvider {
  const mode = process.env.OCR_PROVIDER ?? "fixture";
  if (mode === "openai") return createOpenAiProvider();
  return createFixtureProvider(); // returns fixtures/sample-ocr.txt
}
```

- [ ] **Step 2: `POST /api/recognize`** multipart photos → auth required → OCR → `parseReportFromOcrText` → return `{ payload, warnings }` where warnings list empty key sections.

- [ ] **Step 3: Test fixture provider returns parseable text**

- [ ] **Step 4: Commit**

```bash
git commit -am "feat(post-report): pluggable OCR provider and recognize API"
```

---

### Task 7: Reports CRUD API + photo storage

**Files:**
- Create: `post-report/src/app/api/reports/route.ts`
- Create: `post-report/src/app/api/reports/[id]/route.ts`
- Create: `post-report/src/lib/reports.ts`
- Create: `post-report/tests/reportsApi.test.ts`
- Create: `post-report/uploads/.gitkeep`

**Interfaces:**
- Produces: list/create/get/patch reports; photos under `uploads/{reportId}/`
- Consumes: `deriveRisks`, `ReportPayload`, session

- [ ] **Step 1: `createReport` helper**

```ts
export async function createReport(input: {
  reportDate: string;
  shiftNo: number;
  officerName: string;
  payload: ReportPayload;
  photoPaths: string[];
}): Promise<number> {
  const risks = deriveRisks(input.payload, input.reportDate);
  const rows = await sql<{ id: number }>(
    `INSERT INTO reports (report_date, shift_no, officer_name, payload, has_risks)
     VALUES ($1,$2,$3,$4::jsonb,$5) RETURNING id`,
    [
      input.reportDate,
      input.shiftNo,
      input.officerName,
      JSON.stringify(input.payload),
      risks.length > 0,
    ],
  );
  const id = rows[0].id;
  for (let i = 0; i < input.photoPaths.length; i++) {
    await sql(
      `INSERT INTO report_photos (report_id, page_no, file_path) VALUES ($1,$2,$3)`,
      [id, i + 1, input.photoPaths[i]],
    );
  }
  return id;
}
```

- [ ] **Step 2: GET list** ordered by `report_date DESC, created_at DESC`  
- [ ] **Step 3: PATCH** updates payload fields after save (no OCR required)  
- [ ] **Step 4: Tests** create + list shared visibility  
- [ ] **Step 5: Commit**

```bash
git commit -am "feat(post-report): reports CRUD and photo paths"
```

---

### Task 8: Mobile UI — feed, new report, card

**Files:**
- Create: `post-report/src/app/(app)/layout.tsx` (session gate)
- Create: `post-report/src/app/(app)/page.tsx` (лента)
- Create: `post-report/src/app/(app)/reports/new/page.tsx`
- Create: `post-report/src/app/(app)/reports/[id]/page.tsx`
- Create: `post-report/src/components/SummaryPanel.tsx`
- Create: `post-report/src/components/TablesPanel.tsx`
- Create: `post-report/src/components/RisksPanel.tsx`
- Create: `post-report/src/components/LineList.tsx`
- Modify: styles from `mockups/iphone-report-app.html` (dark mobile)

**Interfaces:**
- Consumes: APIs from Tasks 3–7, `LABELS`
- `LineList` renders children one per line (`display:block` / `<br>` / `<ul>`)

- [ ] **Step 1: `LineList` component**

```tsx
export function LineList({
  items,
}: {
  items: { key: string; text: string }[];
}) {
  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0, lineHeight: 1.55 }}>
      {items.map((i) => (
        <li key={i.key}>{i.text}</li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 2: `SummaryPanel`** — stats row; VH block with `LineList` for each goods count; line `Выпущено ДТ — N`; shift ops `LineList` with `ДО1 —`, `ДО2 —`, `Таможенное наблюдение (ТН) —`, `ДТ ИМПОРТ —`, `ДТ ЭКСПОРТ —`, `ПДТ с начала года (нарастающим) —`; `НШС (ТП)` block.

- [ ] **Step 3: `TablesPanel`** — roadstead, waiting departure, **Иные товары на ПЗТК** with `м³` / `т`.

- [ ] **Step 4: `RisksPanel`** from `deriveRisks`.

- [ ] **Step 5: New report flow** — select shift + officer → `<input type="file" accept="image/*" capture="environment" multiple>` → POST recognize → edit payload JSON fields in simple forms → POST create report → redirect to card.

- [ ] **Step 6: Manual smoke** `npm run dev`, open login, create report with fixture OCR.

- [ ] **Step 7: Commit**

```bash
git commit -am "feat(post-report): feed, new report, and report card UI"
```

---

### Task 9: Statistics

**Files:**
- Create: `post-report/src/lib/stats.ts`
- Create: `post-report/src/app/api/stats/route.ts`
- Create: `post-report/src/app/(app)/stats/page.tsx`
- Create: `post-report/tests/stats.test.ts`

**Interfaces:**
- Produces: `computeStats(reports, from, to)` → downtime hours sum, vessel counts, tonnage, reports per shift

- [ ] **Step 1: Unit test** with two in-memory payloads spanning a week  
- [ ] **Step 2: Implement + API `?from=&to=`**  
- [ ] **Step 3: Stats page** period pills (неделя / месяц / свой)  
- [ ] **Step 4: Commit**

```bash
git commit -am "feat(post-report): period statistics"
```

---

### Task 10: PWA manifest + README + acceptance check

**Files:**
- Create: `post-report/public/manifest.webmanifest`
- Create: `post-report/public/icons/icon-192.png` (simple solid icon)
- Modify: `post-report/src/app/layout.tsx` (manifest link, apple-mobile-web-app)
- Create: `post-report/README.md`
- Create: `post-report/tests/acceptanceLabels.test.ts` (snapshot SummaryPanel HTML contains canon strings and newlines via list items)

- [ ] **Step 1: Manifest** `name: "Отчёт поста МТП Махачкала"`, `display: "standalone"`, `start_url: "/"`  

- [ ] **Step 2: README** — dev (`npm run dev`, code `posta` after bootstrap), OCR env vars, publish notes (`cursor-app.json` database)

- [ ] **Step 3: Acceptance test** asserting Summary markup uses `Выпущено ДТ` and separate `<li>` per shift op

- [ ] **Step 4: Full test suite**

Run: `cd post-report && env -u DATABASE_URL npm test`  
Expected: all PASS

- [ ] **Step 5: Commit + push**

```bash
git add post-report
git commit -m "feat(post-report): PWA manifest and acceptance checks"
git push -u origin HEAD
```

---

## Spec coverage checklist

| Spec requirement | Task |
| --- | --- |
| Photo → OCR → structured report | 5, 6, 7, 8 |
| Summary / tables / risks | 5, 8 |
| Archive + period stats | 7, 9 |
| Shared post code access | 3 |
| Shift + surname from directory | 4, 8 |
| Label canon + line lists | 1, 8, 10 |
| VH breakdown + Выпущено ДТ | 5, 8 |
| Shift ops ДО1/ДО2/ТН/ДТ ИМПОРТ/ЭКСПОРТ/ПДТ | 5, 8 |
| Иные товары на ПЗТК + м³ | 5, 8 |
| НШС (ТП) | 5, 8 |
| Edit after OCR / after save | 6, 7, 8 |
| PWA iPhone | 10 |
| No App Store / no personal accounts | Global constraints |

## Self-review notes

- No TBD left for core v1; OpenAI OCR is optional behind env — fixture path keeps tests deterministic  
- Types centered on `ReportPayload` from Task 1  
- Parser maps legacy OCR abbreviations to canon fields; UI only prints `LABELS` / full agreed strings
