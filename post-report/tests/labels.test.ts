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