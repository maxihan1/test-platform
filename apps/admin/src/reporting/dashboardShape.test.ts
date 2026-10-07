// 대시보드 집계 순수 함수 검사 — DB 없이 접은 줄만 넣어 통과율 · 일별 · 서비스별 · 신규 실패 · 히트맵을 본다

import { describe, expect, it } from 'vitest';
import {
  창날수,
  신규실패상한,
  히트맵케이스수,
  커버리지날수,
  흐름실행수,
  날짜더하기,
  대시보드집계,
  type 접은줄,
  type 앞판정,
} from './dashboardShape.js';

const 오늘 = '2026-10-07';

let 번호 = 0;
function 줄(덮: Partial<접은줄>): 접은줄 {
  번호 += 1;
  return {
    runId: 번호,
    serviceId: 1,
    serviceName: '마켓',
    env: 'stage',
    kind: 'UI',
    day: 오늘,
    finishedAt: `${덮.day ?? 오늘}T10:00:00.000Z`,
    tcId: 'MKT-001',
    tcName: '로그인',
    platform: 'desktop',
    verdict: 'PASS',
    unconfirmed: false,
    reason: null,
    ...덮,
  };
}

const 앞 = (tcId: string, verdict: 앞판정['verdict'], 덮: Partial<앞판정> = {}): 앞판정 => ({
  tcId,
  platform: 'desktop',
  verdict,
  unconfirmed: false,
  ...덮,
});

describe('상수', () => {
  it('명세가 정한 값이다', () => {
    expect([창날수, 신규실패상한, 히트맵케이스수, 커버리지날수, 흐름실행수]).toEqual([14, 10, 8, 30, 20]);
  });
});

describe('날짜더하기', () => {
  it('달 · 해 경계를 넘는다', () => {
    expect(날짜더하기('2026-10-07', -13)).toBe('2026-09-24');
    expect(날짜더하기('2026-01-02', -5)).toBe('2025-12-28');
    expect(날짜더하기('2028-02-28', 1)).toBe('2028-02-29');
  });
});

describe('빈 입력', () => {
  it('전부 0 · 일별 14칸 0 · 목록이 빈다', () => {
    const 결과 = 대시보드집계([], new Map(), 오늘);
    expect(결과.이번).toEqual({ 통과: 0, 실패: 0, 미실행: 0 });
    expect(결과.직전).toEqual({ 통과: 0, 실패: 0, 미실행: 0 });
    expect(결과.미확정건수).toBe(0);
    expect(결과.일별).toHaveLength(14);
    expect(결과.일별[0]).toEqual({ day: '2026-09-24', 통과: 0, 실패: 0, 미실행: 0 });
    expect(결과.일별[13]?.day).toBe(오늘);
    expect(결과.서비스별).toEqual([]);
    expect(결과.신규실패).toEqual([]);
    expect(결과.히트맵).toEqual([]);
  });
});

describe('창 나누기', () => {
  it('이번은 오늘부터 14일, 직전은 그 앞 14일이고 그 밖은 버린다', () => {
    const 결과 = 대시보드집계(
      [
        줄({ day: '2026-10-07', verdict: 'PASS' }),
        줄({ day: '2026-09-24', verdict: 'FAIL' }),
        줄({ day: '2026-09-23', verdict: 'PASS' }),
        줄({ day: '2026-09-10', verdict: 'NA' }),
        줄({ day: '2026-09-09', verdict: 'PASS' }),
        줄({ day: '2026-10-08', verdict: 'PASS' }),
      ],
      new Map(),
      오늘,
    );
    expect(결과.이번).toEqual({ 통과: 1, 실패: 1, 미실행: 0 });
    expect(결과.직전).toEqual({ 통과: 1, 실패: 0, 미실행: 1 });
  });

  it('미확정 줄은 통과율 · 일별에서 빠지고 이번 창만 따로 센다', () => {
    const 결과 = 대시보드집계(
      [
        줄({ verdict: 'PASS' }),
        줄({ verdict: 'FAIL', unconfirmed: true }),
        줄({ verdict: 'PASS', unconfirmed: true, day: '2026-09-20' }),
      ],
      new Map(),
      오늘,
    );
    expect(결과.이번).toEqual({ 통과: 1, 실패: 0, 미실행: 0 });
    expect(결과.직전).toEqual({ 통과: 0, 실패: 0, 미실행: 0 });
    expect(결과.미확정건수).toBe(1);
    expect(결과.일별[13]).toEqual({ day: 오늘, 통과: 1, 실패: 0, 미실행: 0 });
  });
});

describe('일별', () => {
  it('날짜마다 셋을 세고 빈 날은 0 이다', () => {
    const 결과 = 대시보드집계(
      [
        줄({ day: '2026-10-05', verdict: 'PASS' }),
        줄({ day: '2026-10-05', verdict: 'FAIL', tcId: 'MKT-002' }),
        줄({ day: '2026-10-05', verdict: 'NA', tcId: 'MKT-003' }),
      ],
      new Map(),
      오늘,
    );
    const 하루 = 결과.일별.find((d) => d.day === '2026-10-05');
    expect(하루).toEqual({ day: '2026-10-05', 통과: 1, 실패: 1, 미실행: 1 });
    expect(결과.일별.find((d) => d.day === '2026-10-06')).toEqual({ day: '2026-10-06', 통과: 0, 실패: 0, 미실행: 0 });
  });
});

describe('서비스별', () => {
  it('서비스마다 이번 · 직전 · 마지막 실행을 낸다', () => {
    const 결과 = 대시보드집계(
      [
        줄({ runId: 100, serviceId: 1, day: '2026-10-01', finishedAt: '2026-10-01T09:00:00.000Z', verdict: 'FAIL' }),
        줄({ runId: 101, serviceId: 1, day: '2026-10-06', finishedAt: '2026-10-06T09:00:00.000Z', verdict: 'PASS' }),
        줄({ runId: 101, serviceId: 1, day: '2026-10-06', finishedAt: '2026-10-06T09:00:00.000Z', verdict: 'FAIL', tcId: 'MKT-002' }),
        줄({ runId: 101, serviceId: 1, day: '2026-10-06', finishedAt: '2026-10-06T09:00:00.000Z', verdict: 'NA', tcId: 'MKT-003' }),
        줄({ runId: 101, serviceId: 1, day: '2026-10-06', finishedAt: '2026-10-06T09:00:00.000Z', verdict: 'PASS', unconfirmed: true, tcId: 'MKT-004' }),
        줄({ runId: 90, serviceId: 1, day: '2026-09-15', finishedAt: '2026-09-15T09:00:00.000Z', verdict: 'PASS' }),
      ],
      new Map(),
      오늘,
    );
    expect(결과.서비스별).toHaveLength(1);
    const 마켓 = 결과.서비스별[0];
    expect(마켓?.이번).toEqual({ 통과: 1, 실패: 2, 미실행: 1 });
    expect(마켓?.직전).toEqual({ 통과: 1, 실패: 0, 미실행: 0 });
    expect(마켓?.마지막실행).toEqual({
      runId: 101,
      finishedAt: '2026-10-06T09:00:00.000Z',
      통과: 1,
      실패: 1,
      미실행: 1,
    });
  });

  it('직전 창에만 실행이 있는 서비스도 낸다', () => {
    const 결과 = 대시보드집계(
      [줄({ serviceId: 2, serviceName: '쇼핑', day: '2026-09-15', verdict: 'PASS' })],
      new Map(),
      오늘,
    );
    expect(결과.서비스별).toHaveLength(1);
    expect(결과.서비스별[0]?.serviceName).toBe('쇼핑');
    expect(결과.서비스별[0]?.이번).toEqual({ 통과: 0, 실패: 0, 미실행: 0 });
    expect(결과.서비스별[0]?.직전.통과).toBe(1);
  });

  it('서비스 번호 순으로 낸다', () => {
    const 결과 = 대시보드집계(
      [줄({ serviceId: 3, serviceName: '다' }), 줄({ serviceId: 1, serviceName: '가' })],
      new Map(),
      오늘,
    );
    expect(결과.서비스별.map((s) => s.serviceId)).toEqual([1, 3]);
  });
});

describe('신규 실패', () => {
  it('앞 PASS 와 앞 NA 에서 FAIL 이 된 것만 낸다', () => {
    const a = 줄({ runId: 10, tcId: 'MKT-001', verdict: 'FAIL' });
    const b = 줄({ runId: 10, tcId: 'MKT-002', verdict: 'FAIL' });
    const c = 줄({ runId: 10, tcId: 'MKT-003', verdict: 'FAIL' });
    const d = 줄({ runId: 10, tcId: 'MKT-004', verdict: 'PASS' });
    const 결과 = 대시보드집계(
      [a, b, c, d],
      new Map([[10, [앞('MKT-001', 'PASS'), 앞('MKT-002', 'NA'), 앞('MKT-003', 'FAIL'), 앞('MKT-004', 'PASS')]]]),
      오늘,
    );
    expect(결과.신규실패.map((n) => n.tcId).sort()).toEqual(['MKT-001', 'MKT-002']);
  });

  it('앞 실행에 없던 케이스는 견주지 않는다', () => {
    const 결과 = 대시보드집계(
      [줄({ runId: 10, tcId: 'MKT-009', verdict: 'FAIL' })],
      new Map([[10, [앞('MKT-001', 'PASS')]]]),
      오늘,
    );
    expect(결과.신규실패).toEqual([]);
  });

  it('앞 실행 자체가 없으면(다른 env 만 있는 경우 포함) 견주지 않는다', () => {
    const 결과 = 대시보드집계([줄({ runId: 10, verdict: 'FAIL' })], new Map(), 오늘);
    expect(결과.신규실패).toEqual([]);
  });

  it('어느 한쪽이 미확정이면 견주지 않는다', () => {
    const 결과 = 대시보드집계(
      [
        줄({ runId: 10, tcId: 'MKT-001', verdict: 'FAIL', unconfirmed: true }),
        줄({ runId: 10, tcId: 'MKT-002', verdict: 'FAIL' }),
      ],
      new Map([[10, [앞('MKT-001', 'PASS'), 앞('MKT-002', 'PASS', { unconfirmed: true })]]]),
      오늘,
    );
    expect(결과.신규실패).toEqual([]);
  });

  it('디바이스가 다르면 앞 판정과 짝이 아니다', () => {
    const 결과 = 대시보드집계(
      [줄({ runId: 10, verdict: 'FAIL', platform: 'mobile' })],
      new Map([[10, [앞('MKT-001', 'PASS')]]]),
      오늘,
    );
    expect(결과.신규실패).toEqual([]);
  });

  it('최근 14일 실행에서 생긴 것만 낸다', () => {
    const 결과 = 대시보드집계(
      [줄({ runId: 10, day: '2026-09-23', verdict: 'FAIL' })],
      new Map([[10, [앞('MKT-001', 'PASS')]]]),
      오늘,
    );
    expect(결과.신규실패).toEqual([]);
  });

  it('같은 (서비스, 케이스, 디바이스)는 가장 최근 하나만, 최근 것부터 낸다', () => {
    const 결과 = 대시보드집계(
      [
        줄({ runId: 10, day: '2026-10-01', finishedAt: '2026-10-01T10:00:00.000Z', verdict: 'FAIL' }),
        줄({ runId: 11, day: '2026-10-05', finishedAt: '2026-10-05T10:00:00.000Z', verdict: 'FAIL' }),
        줄({ runId: 12, day: '2026-10-03', finishedAt: '2026-10-03T10:00:00.000Z', verdict: 'FAIL', tcId: 'MKT-002' }),
      ],
      new Map([
        [10, [앞('MKT-001', 'PASS')]],
        [11, [앞('MKT-001', 'PASS')]],
        [12, [앞('MKT-002', 'PASS')]],
      ]),
      오늘,
    );
    expect(결과.신규실패.map((n) => [n.runId, n.tcId])).toEqual([
      [11, 'MKT-001'],
      [12, 'MKT-002'],
    ]);
  });

  it('상한을 넘기면 자른다', () => {
    const 줄들 = Array.from({ length: 신규실패상한 + 3 }, (_, i) =>
      줄({ runId: 200 + i, tcId: `MKT-${100 + i}`, verdict: 'FAIL' }),
    );
    const 앞들 = new Map<number, 앞판정[]>(줄들.map((r) => [r.runId, [앞(r.tcId, 'PASS')]]));
    expect(대시보드집계(줄들, 앞들, 오늘).신규실패).toHaveLength(신규실패상한);
  });
});

describe('신규 실패 — 지금도 실패인 것만', () => {
  const 앞PASS = (...runIds: number[]): Map<number, 앞판정[]> => new Map(runIds.map((id) => [id, [앞('MKT-001', 'PASS')]]));

  it('뒤 실행에서 다시 통과하면 뺀다', () => {
    const 결과 = 대시보드집계(
      [
        줄({ runId: 10, day: '2026-10-03', finishedAt: '2026-10-03T10:00:00.000Z', verdict: 'FAIL' }),
        줄({ runId: 11, day: '2026-10-05', finishedAt: '2026-10-05T10:00:00.000Z', verdict: 'PASS' }),
      ],
      앞PASS(10),
      오늘,
    );
    expect(결과.신규실패).toEqual([]);
    expect(결과.서비스별[0]?.신규실패수).toBe(0);
  });

  it('뒤 실행에서 못 돌았으면(미실행) 뺀다', () => {
    const 결과 = 대시보드집계(
      [
        줄({ runId: 10, day: '2026-10-03', finishedAt: '2026-10-03T10:00:00.000Z', verdict: 'FAIL' }),
        줄({ runId: 11, day: '2026-10-05', finishedAt: '2026-10-05T10:00:00.000Z', verdict: 'NA' }),
      ],
      앞PASS(10),
      오늘,
    );
    expect(결과.신규실패).toEqual([]);
  });

  it('계속 실패면 처음 깨진 실행으로 남긴다', () => {
    const 결과 = 대시보드집계(
      [
        줄({ runId: 10, day: '2026-10-03', finishedAt: '2026-10-03T10:00:00.000Z', verdict: 'FAIL' }),
        줄({ runId: 11, day: '2026-10-05', finishedAt: '2026-10-05T10:00:00.000Z', verdict: 'FAIL' }),
      ],
      new Map([
        [10, [앞('MKT-001', 'PASS')]],
        [11, [앞('MKT-001', 'FAIL')]],
      ]),
      오늘,
    );
    expect(결과.신규실패.map((n) => n.runId)).toEqual([10]);
  });

  it('뒤 실행의 미확정 줄은 최근 판정이 아니다', () => {
    const 결과 = 대시보드집계(
      [
        줄({ runId: 10, day: '2026-10-03', finishedAt: '2026-10-03T10:00:00.000Z', verdict: 'FAIL' }),
        줄({ runId: 11, day: '2026-10-05', finishedAt: '2026-10-05T10:00:00.000Z', verdict: 'PASS', unconfirmed: true }),
      ],
      앞PASS(10),
      오늘,
    );
    expect(결과.신규실패).toHaveLength(1);
  });

  it('사유를 그대로 옮기고 값 칸은 없다', () => {
    const 결과 = 대시보드집계(
      [줄({ runId: 10, verdict: 'FAIL', reason: '로그인 버튼이 보인다' })],
      앞PASS(10),
      오늘,
    );
    expect(결과.신규실패[0]?.reason).toBe('로그인 버튼이 보인다');
    expect(Object.keys(결과.신규실패[0] ?? {})).not.toContain('actual');
  });

  it('서비스별 신규 실패 수는 상한으로 자르기 전 전부다', () => {
    const 줄들 = Array.from({ length: 신규실패상한 + 3 }, (_, i) =>
      줄({ runId: 300 + i, tcId: `MKT-${100 + i}`, verdict: 'FAIL' }),
    );
    const 앞들 = new Map<number, 앞판정[]>(줄들.map((r) => [r.runId, [앞(r.tcId, 'PASS')]]));
    const 결과 = 대시보드집계(줄들, 앞들, 오늘);
    expect(결과.신규실패).toHaveLength(신규실패상한);
    expect(결과.서비스별[0]?.신규실패수).toBe(신규실패상한 + 3);
  });
});

describe('서비스별 최근 실행 흐름 · 해결', () => {
  const 실행줄 = (runId: number, day: string, verdict: 접은줄['verdict'], 덮: Partial<접은줄> = {}): 접은줄 =>
    줄({ runId, day, finishedAt: `${day}T0${runId % 10}:00:00.000Z`, verdict, ...덮 });

  it('실패 있음 F · 전부 통과 P · 그 밖 N 을 오래된 것부터 늘어놓는다', () => {
    const 결과 = 대시보드집계(
      [
        실행줄(1, '2026-10-01', 'PASS'),
        실행줄(1, '2026-10-01', 'PASS', { tcId: 'MKT-002' }),
        실행줄(2, '2026-10-02', 'FAIL'),
        실행줄(2, '2026-10-02', 'PASS', { tcId: 'MKT-002' }),
        실행줄(3, '2026-10-03', 'NA'),
        실행줄(4, '2026-10-04', 'PASS'),
        실행줄(4, '2026-10-04', 'FAIL', { tcId: 'MKT-002', unconfirmed: true }),
        실행줄(5, '2026-10-05', 'FAIL', { unconfirmed: true }),
      ],
      new Map(),
      오늘,
    );
    expect(결과.서비스별[0]?.흐름).toEqual(['P', 'F', 'N', 'P', 'N']);
  });

  it('최근 흐름실행수개만 남긴다', () => {
    const 줄들 = Array.from({ length: 흐름실행수 + 2 }, (_, i) =>
      줄({ runId: 500 + i, day: '2026-10-07', finishedAt: `2026-10-07T10:${String(i).padStart(2, '0')}:00.000Z`, verdict: i === 0 ? 'FAIL' : 'PASS' }),
    );
    const 흐름 = 대시보드집계(줄들, new Map(), 오늘).서비스별[0]?.흐름;
    expect(흐름).toHaveLength(흐름실행수);
    expect(흐름?.includes('F')).toBe(false);
  });

  it('고쳐짐은 앞 FAIL 이 이번 PASS 가 된 것이고 같은 케이스는 한 번만 센다', () => {
    const 결과 = 대시보드집계(
      [
        실행줄(1, '2026-10-02', 'PASS'),
        실행줄(2, '2026-10-04', 'PASS'),
        실행줄(3, '2026-10-05', 'PASS', { tcId: 'MKT-002' }),
        실행줄(4, '2026-10-06', 'PASS', { tcId: 'MKT-003' }),
      ],
      new Map([
        [1, [앞('MKT-001', 'FAIL')]],
        [2, [앞('MKT-001', 'FAIL')]],
        [3, [앞('MKT-002', 'PASS')]],
        [4, [앞('MKT-003', 'FAIL', { unconfirmed: true })]],
      ]),
      오늘,
    );
    expect(결과.서비스별[0]?.해결수).toBe(1);
  });

  it('고친 뒤 다시 실패하면 해결이 아니다', () => {
    const 결과 = 대시보드집계(
      [실행줄(1, '2026-10-02', 'PASS'), 실행줄(2, '2026-10-05', 'FAIL')],
      new Map([
        [1, [앞('MKT-001', 'FAIL')]],
        [2, [앞('MKT-001', 'PASS')]],
      ]),
      오늘,
    );
    expect(결과.서비스별[0]?.해결수).toBe(0);
  });
});

describe('히트맵', () => {
  it('실패 많은 케이스부터 14칸, 칸 값은 0 · 1 · 2 이상은 2 다', () => {
    const 결과 = 대시보드집계(
      [
        줄({ tcId: 'MKT-002', day: '2026-10-07', verdict: 'FAIL' }),
        줄({ tcId: 'MKT-002', day: '2026-10-07', verdict: 'FAIL', platform: 'mobile' }),
        줄({ tcId: 'MKT-002', day: '2026-10-07', verdict: 'FAIL', env: 'prod' }),
        줄({ tcId: 'MKT-002', day: '2026-10-06', verdict: 'FAIL' }),
        줄({ tcId: 'MKT-001', day: '2026-10-07', verdict: 'FAIL' }),
        줄({ tcId: 'MKT-003', day: '2026-10-07', verdict: 'PASS' }),
        줄({ tcId: 'MKT-004', day: '2026-10-07', verdict: 'FAIL', unconfirmed: true }),
        줄({ tcId: 'MKT-005', day: '2026-09-23', verdict: 'FAIL' }),
      ],
      new Map(),
      오늘,
    );
    expect(결과.히트맵.map((h) => [h.tcId, h.실패수])).toEqual([
      ['MKT-002', 4],
      ['MKT-001', 1],
    ]);
    const 첫 = 결과.히트맵[0];
    expect(첫?.칸).toHaveLength(14);
    expect(첫?.칸[13]).toBe(2);
    expect(첫?.칸[12]).toBe(1);
    expect(첫?.칸[0]).toBe(0);
  });

  it('실패 수가 같으면 tc_id 오름차순이고 상위 8개만 낸다', () => {
    const 줄들 = Array.from({ length: 히트맵케이스수 + 2 }, (_, i) =>
      줄({ tcId: `MKT-${String(90 - i).padStart(3, '0')}`, verdict: 'FAIL' }),
    );
    const 결과 = 대시보드집계(줄들, new Map(), 오늘);
    expect(결과.히트맵).toHaveLength(히트맵케이스수);
    const ids = 결과.히트맵.map((h) => h.tcId);
    expect(ids).toEqual([...ids].sort());
  });
});
