// 페이지 성능 화면 검사 둘이 같이 쓰는 가짜 응답 (검사 전용)

import type { ServiceRow } from './api.js';
import type { 실행상세, 실행줄 } from './perfApi.js';
import type { Compare, PageRow } from './perfPageApi.js';

export const 앱: ServiceRow = {
  id: 7,
  prefix: 'ZPP',
  name: '데모마켓 웹',
  color: '#000',
  projectId: 3,
  projectName: '데모마켓',
  envs: [{ env: 'qa', baseUrl: 'https://qa.example.com' }],
  hasSlackWebhook: false,
  permissions: { cases: 'read', runs: 'write', authoring: 'read' },
};

export const 줄 = (덮: Partial<실행줄>): 실행줄 => ({
  id: 21,
  kind: 'PAGE',
  status: 'DONE',
  verdict: 'FAIL',
  title: '',
  env: 'qa',
  startedAt: '2026-10-21T04:40:00Z',
  durationSec: 120,
  summary: { peakVus: null, maxTps: null, p95Ms: null, errorRate: null },
  testType: null,
  origin: 'MANUAL',
  degraded: null,
  stopReason: null,
  measures: null,
  ...덮,
});

export const 페이지들 = [
  { url: '/', name: '메인', login: false },
  { url: '/products', name: '상품 목록', login: false },
  { url: '/products/1', name: '상품 상세', login: false },
];

export const 상세 = (덮: Partial<실행상세> = {}): 실행상세 => ({
  id: 21,
  code: 'PRF-0021',
  kind: 'PAGE',
  status: 'DONE',
  verdict: 'FAIL',
  stopReason: null,
  testType: null,
  env: 'qa',
  scenarioId: null,
  servicePrefix: 'ZPP',
  scenarioName: '',
  origin: 'MANUAL',
  createdAt: '2026-10-21T04:39:00Z',
  startedAt: '2026-10-21T04:40:00Z',
  finishedAt: '2026-10-21T04:42:00Z',
  config: { testType: 'LOAD', load: { basis: 'VUS', stages: [] }, targets: [], agentIds: [11], monitorIds: [], durationSec: 120, maxVus: 1, pages: 페이지들, device: 'mobile', network: 'SLOW_4G' },
  targets: null,
  summary: { peakVus: null, maxTps: null, p95Ms: null, errorRate: null },
  degraded: null,
  ai: null,
  aiJob: null,
  previous: null,
  transactions: [],
  comparePoint: null,
  ...덮,
});

export const 행 = (덮: Partial<PageRow>): PageRow => ({
  url: '/',
  name: '메인',
  sec: null,
  vus: null,
  device: 'mobile',
  network: 'SLOW_4G',
  lcpMs: 1000,
  fcpMs: 600,
  cls: 0.02,
  ttfbMs: 100,
  lcpElement: null,
  resources: [],
  ai: null,
  verdict: 'PASS',
  ...덮,
});

export const 결과 = {
  pages: [
    행({}),
    행({ url: '/products', name: '상품 목록', lcpMs: 1200, fcpMs: 700, cls: 0.01 }),
    행({
      url: '/products/1',
      name: '상품 상세',
      lcpMs: 2900,
      fcpMs: 800,
      cls: 0.18,
      verdict: 'FAIL',
      lcpElement: 'img hero.jpg',
      resources: [
        { name: 'HTML 문서', type: 'document', startMs: 0, durationMs: 200, bytes: 9000 },
        { name: 'JS 번들', type: 'script', startMs: 200, durationMs: 500, bytes: 90000 },
        { name: '대표 상품 이미지', type: 'img', startMs: 1100, durationMs: 1600, bytes: 1900000 },
      ],
      ai: ['LCP 지연: 대표 상품 이미지가 1.9MB 라 1.6초 걸립니다', 'CLS 0.18: 이미지 영역 크기를 지정해야 합니다'],
    }),
  ],
  compare: { runId: 12, code: 'PRF-0012', kind: 'LOAD', vus: 1350, pages: [{ url: '/', lcpMs: 2200 }, { url: '/products', lcpMs: 3800 }] } satisfies Compare,
};
