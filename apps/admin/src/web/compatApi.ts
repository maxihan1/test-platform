// 호환성 화면이 서버를 부르는 호출 모음. 응답 모양은 admin compat/routes.ts 통로를 그대로 옮겼다 (도메인/호환성 §7)

import { call, json } from './api.js';

/** 세트에 저장한 디바이스 사본. name 은 기종명이고 없으면 모델이다 */
export interface CompatSetDevice {
  serial: string;
  model: string;
  name: string;
}

export interface CompatCoverage {
  covered: number;
  total: number;
  /** 전체 화면 목록이 없어 케이스가 아는 화면으로 셌는지 */
  fallback: boolean;
}

export interface CompatSetRow {
  id: number;
  name: string;
  onePerModel: boolean;
  devices: CompatSetDevice[];
  addedCases: string[];
  coverage: CompatCoverage;
  lastRun: { runId: number; startedAt: string; state: string; confirmed: number; pending: number; unchecked: number } | null;
}

export interface CompatAuto {
  tcId: string;
  name: string;
  adds: number;
}

export interface CompatScreen {
  key: string;
  name: string;
}

export interface CompatSetDetail extends CompatSetRow {
  auto: CompatAuto[];
  uncovered: CompatScreen[];
  estimate: { runs: number; testMinutes: number; checkMinutes: number };
}

export interface CompatPreview {
  auto: CompatAuto[];
  coverage: CompatCoverage;
  uncovered: CompatScreen[];
}

export type 디바이스상태 = 'IDLE' | 'OCCUPIED' | 'MAINTENANCE' | 'OFFLINE';

/** 팜 폰 한 대. ? 칸은 비전이 못 읽었으면 없다 (비전 안내서 11절) */
export interface CompatDevice {
  serial: string;
  model: string;
  manufacturer: string;
  os: string;
  resolution: string;
  state: 디바이스상태;
  marketName?: string;
  density?: number;
  inches?: number;
  formFactor?: 'phone' | 'foldable' | 'tablet';
  displays?: { size: string; inches: number }[];
  fold?: 'unfolded' | 'folded';
}

export interface CompatSetBody {
  serviceId: number;
  name: string;
  onePerModel: boolean;
  devices: { serial: string }[];
  addedCases: string[];
}

export const compatApi = {
  sets: (serviceId: number) => call<{ sets: CompatSetRow[] }>(`/compat-sets?serviceId=${String(serviceId)}`),
  set: (id: number) => call<CompatSetDetail>(`/compat-sets/${String(id)}`),
  /** 케이스를 더하거나 뺄 때 저장 전에 다시 센다. 저장하지 않는다 */
  preview: (serviceId: number, addedCases: string[]) => call<CompatPreview>('/compat-sets/preview', json({ serviceId, addedCases })),
  create: (body: CompatSetBody) => call<{ id: number }>('/compat-sets', json(body)),
  update: (id: number, body: CompatSetBody) => call<{ id: number }>(`/compat-sets/${String(id)}`, { ...json(body), method: 'PUT' }),
  devices: () => call<{ devices: CompatDevice[] }>('/compat-devices'),
};
