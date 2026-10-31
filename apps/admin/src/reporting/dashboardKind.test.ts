// 대시보드 종류별 칸 세기 — 단위로 나누기 · 95% 백분위수 (도메인/리포팅 §8.12 「종류별 칸」)

import { describe, expect, it } from 'vitest';

import { 백분위95, 종류줄을센다, 틀로접는다, 한곳에서만실패 } from './dashboardKind.js';
import type { 접은줄 } from './dashboardShape.js';

const 줄 = (tcId: string, platform: 'desktop' | 'mobile', verdict: 접은줄['verdict']): 접은줄 => ({
  runId: 1,
  serviceId: 1,
  serviceName: '웹',
  env: 'qa',
  kind: 'FN',
  day: '2026-10-30',
  startedAt: '2026-10-30T00:00:00.000Z',
  finishedAt: '2026-10-30T00:05:00.000Z',
  tcId,
  tcName: tcId,
  platform,
  verdict,
  unconfirmed: false,
  reason: null,
  cause: null,
});

describe('백분위95', () => {
  it('가장 가까운 순위로 고른다', () => {
    expect(백분위95([])).toBeNull();
    expect(백분위95([7])).toBe(7);
    expect(백분위95(Array.from({ length: 20 }, (_, i) => 20 - i))).toBe(19);
    expect(백분위95(Array.from({ length: 100 }, (_, i) => i + 1))).toBe(95);
  });
});

describe('종류줄을센다', () => {
  it('단위마다 통과 · 실패 · 미실행을 세고 이름 차례, 모르는 단위는 맨 뒤다', () => {
    const 줄들 = [줄('A', 'mobile', 'FAIL'), 줄('A', 'desktop', 'PASS'), 줄('B', 'desktop', 'NA'), 줄('C', 'desktop', 'PASS')];
    const 이름 = new Map([['A', null], ['B', 'desktop'], ['C', 'desktop']]);
    expect(종류줄을센다(줄들, (x) => [x.tcId === 'A' ? 이름.get('A')! : x.platform])).toEqual([
      { label: 'desktop', pass: 1, fail: 0, notRun: 1, p95Ms: null },
      { label: null, pass: 1, fail: 1, notRun: 0, p95Ms: null },
    ]);
  });

  it('한 줄이 여러 단위에 들면 단위마다 한 번씩 세고, 빈 단위면 안 센다 · 걸린 시간은 이름으로 붙는다', () => {
    const 단위 = (x: 접은줄) => (x.tcId === 'A' ? ['GET /a', 'POST /a', 'GET /a'] : []);
    const 걸린시간 = new Map([['GET /a', [100, 300, 200]]]);
    expect(종류줄을센다([줄('A', 'desktop', 'FAIL'), 줄('B', 'desktop', 'PASS')], 단위, 걸린시간)).toEqual([
      { label: 'GET /a', pass: 0, fail: 1, notRun: 0, p95Ms: 300 },
      { label: 'POST /a', pass: 0, fail: 1, notRun: 0, p95Ms: null },
    ]);
  });
});

describe('한곳에서만실패', () => {
  it('실패한 단위가 하나이고 다른 단위에서 통과한 케이스만 그 단위 몫으로 세고, 많은 차례다', () => {
    const 줄들 = [
      줄('A', 'mobile', 'FAIL'), 줄('A', 'desktop', 'PASS'),
      줄('B', 'mobile', 'FAIL'), 줄('B', 'desktop', 'FAIL'),
      줄('C', 'mobile', 'FAIL'), 줄('C', 'desktop', 'NA'),
      줄('D', 'mobile', 'FAIL'), 줄('D', 'mobile', 'PASS'),
      줄('E', 'desktop', 'FAIL'), 줄('E', 'mobile', 'PASS'),
      줄('F', 'mobile', 'FAIL'), 줄('F', 'desktop', 'PASS'),
    ];
    expect(한곳에서만실패(줄들, (x) => x.platform)).toEqual([
      { label: 'mobile', count: 2 },
      { label: 'desktop', count: 1 },
    ]);
  });

  it('단위를 모르는 줄은 보지 않는다', () => {
    expect(한곳에서만실패([줄('A', 'mobile', 'FAIL'), 줄('A', 'desktop', 'PASS')], (x) => (x.platform === 'desktop' ? null : x.platform))).toEqual([]);
  });
});

describe('틀로접는다', () => {
  it('지도에 있는 틀과 방식 · 마디 수가 같고 틀의 `:` 칸만 다른 이름은 그 틀로 접고, 맞는 틀이 없으면 그대로 둔다', () => {
    const 접기 = 틀로접는다([
      'GET /v1/devices/:n',
      'GET /v1/devices/dev_dmn_none_mvrurusc',
      'GET /v1/devices/dev_dmn_none_mvrurusc/logs',
      'DELETE /v1/devices/dev_dmn_x',
      'GET /v1/devices',
      'GET /v1/devices/search',
      'GET /v1/devices/me_2',
    ]);
    expect(접기.get('GET /v1/devices/dev_dmn_none_mvrurusc')).toBe('GET /v1/devices/:n');
    expect(접기.get('GET /v1/devices/:n')).toBe('GET /v1/devices/:n');
    expect(접기.get('GET /v1/devices/dev_dmn_none_mvrurusc/logs')).toBe('GET /v1/devices/dev_dmn_none_mvrurusc/logs');
    expect(접기.get('DELETE /v1/devices/dev_dmn_x')).toBe('DELETE /v1/devices/dev_dmn_x');
    expect(접기.get('GET /v1/devices')).toBe('GET /v1/devices');
    expect(접기.get('GET /v1/devices/search')).toBe('GET /v1/devices/search');
    expect(접기.get('GET /v1/devices/me_2')).toBe('GET /v1/devices/me_2');
  });
});
