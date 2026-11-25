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