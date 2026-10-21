// 기기 성능 화면 검사가 쓰는 가짜 응답 (검사 전용)

import type { ServiceRow } from './api.js';
import type { 실행상세 } from './perfApi.js';
import type { 고를기기, 기기결과, 기기설정 } from './perfDeviceApi.js';

export const 앱: ServiceRow = {
  id: 8,
  prefix: 'ZQD',
  name: '데모마켓 앱',
  color: '#000',
  projectId: 3,
  projectName: '데모마켓',
  envs: [{ env: 'qa', baseUrl: 'https://qa.example.com' }],
  hasSlackWebhook: false,
  permissions: { cases: 'read', runs: 'write', authoring: 'read' },
  kind: 'APP',
};

export const 기기들: 고를기기[] = [
  { serial: 'S24', model: 'Galaxy S24', os: '14', where: 'FARM', status: 'IDLE' },
  { serial: 'A23', model: 'Galaxy A23', os: '13', where: 'FARM', status: 'IDLE' },
  { serial: 'FLIP', model: 'Galaxy Z Flip5', os: '14', where: 'FARM', status: 'BUSY' },
  { serial: 'PX7', model: 'Pixel 7', os: '14', where: 'LOCAL', status: 'IDLE' },
];

export const 설정 = (덮: Partial<기기설정> = {}): 기기설정 => ({
  drive: 'APPIUM',
  caseIds: ['ZQD-001'],
  durationSec: 0,
  package: 'com.demo.market',
  devices: [
    { serial: 'S24', where: 'FARM', model: 'Galaxy S24', launchMs: 2100 },
    { serial: 'A23', where: 'FARM', model: 'Galaxy A23', launchMs: 4600 },
  ],
  repeat: 3,
  metrics: ['FPS', 'TEMP', 'MEM'],
  intervalSec: 1,
  record: true,
  targets: [
    { metric: 'AVG_FPS', op: '>=', value: 45, source: 'MANUAL' },
    { metric: 'LAUNCH_MS', op: '<=', value: 3000, source: 'MANUAL' },
  ],
  ...덮,
});

export const 상세 = (덮: Partial<실행상세> = {}, 설정값: 기기설정 = 설정()): 실행상세 => ({
  id: 40,
  code: 'PRF-0040',
  kind: 'DEVICE',
  status: 'DONE',
  verdict: 'FAIL',
  stopReason: null,
  testType: null,
  env: 'qa',
  scenarioId: null,
  servicePrefix: 'ZQD',
  scenarioName: '',
  origin: 'MANUAL',
  createdAt: '2026-10-22T04:39:00Z',
  startedAt: '2026-10-22T04:40:00Z',
  finishedAt: '2026-10-22T04:50:00Z',
  config: 설정값 as unknown as 실행상세['config'],
  targets: null,
  summary: { peakVus: null, maxTps: null, p95Ms: null, errorRate: null },
  degraded: null,
  ai: { title: '저사양 기기에서 FPS 하락', items: ['Galaxy A23 평균 FPS 31'] },
  aiJob: null,
  previous: null,
  transactions: [],
  comparePoint: null,
  ...덮,
});

const 숫자 = (serial: string, sec: number, fps: number, 덮: Partial<기기결과['metrics'][number]> = {}) => ({
  serial,
  sec,
  loop: 1,
  segment: 'ZQD-001 · 로그인',
  fps,
  jankPct: 1,
  cpu: 40,
  memMb: 900,
  tempC: 38,
  batteryPct: 97,
  ...덮,
});

export const 결과: 기기결과 = {
  devices: [
    { serial: 'S24', model: 'Galaxy S24', where: 'FARM', launchMs: 2100, summary: { avgFps: 59.4, low1Fps: 53, maxTempC: 41, maxMemMb: 1200, avgCpu: 40 }, verdict: 'PASS' },
    { serial: 'A23', model: 'Galaxy A23', where: 'FARM', launchMs: 4600, summary: { avgFps: 31, low1Fps: 22, maxTempC: 46.8, maxMemMb: 1500, avgCpu: 90 }, verdict: 'FAIL' },
  ],
  metrics: [숫자('S24', 0, 60), 숫자('S24', 1, 59), 숫자('A23', 0, 40), 숫자('A23', 1, 31, { loop: 2 })],
  segments: [{ serial: 'A23', loop: 1, segment: 'ZQD-001 · 로그인', fromSec: 0, toSec: 1 }],
  loops: [
    { serial: 'A23', loop: 1, maxMemMb: 1300 },
    { serial: 'A23', loop: 2, maxMemMb: 1400 },
    { serial: 'A23', loop: 3, maxMemMb: 1500 },
  ],
  leak: [{ serial: 'A23', perLoopMb: 100, loopsToLimit: 2 }],
  videos: [
    { serial: 'A23', name: 'rec-0.mp4', startSec: 0 },
    { serial: 'A23', name: 'rec-180.mp4', startSec: 180 },
  ],
  markers: [{ serial: 'A23', sec: 200, label: '3회차 FPS 44 → 31' }],
};
