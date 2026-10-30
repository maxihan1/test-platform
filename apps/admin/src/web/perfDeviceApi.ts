// 성능 테스트 › 기기 성능 화면이 서버를 부르는 호출 · 응답 모양 (도메인/성능 §7 「PERF-F1-08 이 연 통로」)
// perfApi.ts 가 300줄을 넘지 않게 따로 뒀다. 화면은 `perfApi.devices` 처럼 perfApi 로 부른다

import { call, json } from './api.js';
import type { 실행줄 } from './perfApi.js';

export type 기기자리 = 'FARM' | 'LOCAL';
export type 조작 = 'APPIUM' | 'GAME' | 'MANUAL';
export type 측정지표 = 'FPS' | 'JANK' | 'CPU' | 'MEM' | 'TEMP' | 'BATTERY';
export type 기기지표 = 'AVG_FPS' | 'LOW1_FPS' | 'MAX_TEMP' | 'MAX_MEM' | 'LAUNCH_MS';

export interface 고를기기 {
  serial: string;
  model: string;
  os: string;
  where: 기기자리;
  status: 'IDLE' | 'BUSY';
}

/** 기기 성능 목표 한 줄. scope 는 비운다 — 모든 기기에 같은 목표다 (§7 「기기 성능 목표 한 줄」) */
export interface 기기목표 {
  metric: 기기지표;
  op: '<=' | '>=';
  value: number;
  source: 'PRD' | 'AI' | 'MANUAL';
}

export interface 기기측정요청 {
  serviceId: number;
  env: string;
  drive: 조작;
  caseIds?: string[];
  durationSec?: number;
  build: { package: string };
  devices: { serial: string; where: 기기자리 }[];
  repeat: number;
  targets: 기기목표[];
  metrics: 측정지표[];
  intervalSec: 1 | 2 | 5;
  record: boolean;
}

/** 실행의 config — 기기 실행이면 부하 실행의 config 대신 이 꼴이다 */
export interface 기기설정 {
  drive: 조작;
  caseIds: string[];
  durationSec: number;
  package: string;
  devices: { serial: string; where: 기기자리; model: string; launchMs: number | null }[];
  repeat: number;
  metrics: 측정지표[];
  intervalSec: 1 | 2 | 5;
  record: boolean;
  targets: 기기목표[];
}

export interface 기기요약 {
  avgFps: number | null;
  low1Fps: number | null;
  maxTempC: number | null;
  /** 실행 동안 0.7초 넘게 걸린 프레임(프리징)을 더한 것 */
  freezeCount: number | null;
  maxMemMb: number | null;
  avgCpu: number | null;
}

export interface 기기숫자 {
  serial: string;
  sec: number;
  loop: number | null;
  segment: string | null;
  fps: number | null;
  jankPct: number | null;
  freezeCount: number | null;
  cpu: number | null;
  memMb: number | null;
  tempC: number | null;
  batteryPct: number | null;
}

export interface 기기결과 {
  devices: { serial: string; model: string; where: 기기자리; launchMs: number | null; summary: 기기요약; verdict: 'PASS' | 'FAIL' | null }[];
  metrics: 기기숫자[];
  segments: { serial: string; loop: number | null; segment: string; fromSec: number; toSec: number }[];
  loops: { serial: string; loop: number; maxMemMb: number }[];
  leak: { serial: string; perLoopMb: number; loopsToLimit: number | null }[];
  videos: { serial: string; name: string; startSec: number }[];
  markers: { serial: string; sec: number; label: string }[];
}

export interface 기기추천 {
  devices: { serial: string; why: string }[];
  basis: string[];
}

export const 기기호출 = {
  devices: (serviceId: number) => call<{ devices: 고를기기[] }>(`/perf/devices?serviceId=${String(serviceId)}`),
  // DEVICE 실행 목록. 줄의 title 은 빈 글이다 — 화면이 「기기 성능」을 대신 적는다
  devicesRuns: (serviceId: number) => call<{ runs: 실행줄[] }>(`/perf/runs?serviceId=${String(serviceId)}&kind=DEVICE`),
  measureDevices: (요청: 기기측정요청) => call<{ runId: number }>('/perf/devices/measure', json(요청)),
  deviceResult: (id: number, from = 0) => call<기기결과>(`/perf/runs/${String(id)}/devices?from=${String(from)}`),
  // 팜이 꺼졌거나 기기가 없으면 409 NO_DATA
  suggestDevices: (serviceId: number) => call<{ jobId: number }>('/perf/suggest', json({ serviceId, kind: 'DEVICES' })),
};

/** 녹화 화면 주소 — <video> 가 바로 읽는다. Range 는 서버가 받는다 */
export const 영상주소 = (runId: number, serial: string, name: string): string =>
  `/api/perf/runs/${String(runId)}/videos/${encodeURIComponent(serial)}/${encodeURIComponent(name)}`;
