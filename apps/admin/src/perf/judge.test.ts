// 판정 · 자동 중단 · 성능 저하가 명세 §3.9 의 수(10초 · 20% · 20%)대로 도는지 본다

import { describe, expect, it } from 'vitest';

import { bucketOf, emptyHist } from './hist.js';
import { autoStop, bandSecs, comparePoint, degraded, judge, judgeWindow, summary, transactionViews, type SecRow } from './judge.js';
import type { Target } from './types.js';

function 초(sec: number, vus: number, requests: number, errors: number, ms: number, tx = ''): SecRow {
  const hist = emptyHist();
  hist[bucketOf(ms)] = requests;
  return { sec, tx, vus, requests, errors, hist };
}

const p95목표: Target = { metric: 'P95', op: '<=', value: 500, source: 'AI' };
const 에러목표: Target = { metric: 'ERROR_RATE', op: '<=', value: 1, source: 'AI' };

describe('judge', () => {
  it('모든 목표를 지키면 통과, 하나라도 벗어나면 실패다', () => {
    const rows = [초(0, 10, 100, 0, 200), 초(1, 10, 100, 0, 300)];
    expect(judge(rows, [p95목표, 에러목표]).verdict).toBe('PASS');
    const 느림 = [초(0, 10, 100, 0, 900)];
    const r = judge(느림, [p95목표, 에러목표]);
    expect(r.verdict).toBe('FAIL');
    expect(r.targets[0].verdict).toBe('FAIL');
    expect(r.targets[1].verdict).toBe('PASS');
  });

  it('트랜잭션 목표는 그 트랜잭션 줄로만 센다', () => {
    const rows = [초(0, 10, 100, 0, 200), 초(0, 10, 50, 0, 900, '주문')];
    const r = judge(rows, [{ ...p95목표, scope: '주문' }]);
    expect(r.verdict).toBe('FAIL');
  });

  it('TPS 는 최대값으로 잰다', () => {
    const rows = [초(0, 10, 40, 0, 100), 초(1, 10, 120, 0, 100)];
    expect(judge(rows, [{ metric: 'TPS', op: '>=', value: 100, source: 'MANUAL' }]).verdict).toBe('PASS');
    expect(summary(rows).maxTps).toBe(120);
  });

  it('요청이 하나도 없으면 실패다', () => {
    expect(judge([], [에러목표]).verdict).toBe('FAIL');
  });

  it('멈춘 실행은 멈추기 직전 10초로 판정한다', () => {
    const rows = Array.from({ length: 30 }, (_, i) => 초(i, 10, 10, 0, 100));
    expect(judgeWindow(rows, 25).map((r) => r.sec)).toEqual([16, 17, 18, 19, 20, 21, 22, 23, 24, 25]);
    expect(judgeWindow(rows, null)).toHaveLength(30);
  });
});

describe('autoStop', () => {
  it('에러율 20% 이상이 10초 이어지면 모든 유형이 멈춘다', () => {
    const rows = Array.from({ length: 10 }, (_, i) => 초(i, 10, 10, 2, 100));
    expect(autoStop(rows, 'LOAD', [])).toEqual({ reason: 'ERROR_LIMIT', atSec: 9 });
    expect(autoStop(rows.slice(0, 9), 'LOAD', [])).toBeNull();
    const 한번쉼 = rows.map((r, i) => (i === 5 ? 초(5, 10, 10, 1, 100) : r));
    expect(autoStop(한번쉼, 'LOAD', [])).toBeNull();
  });

  it('스트레스 테스트는 목표를 10초 이어 벗어나면 멈추고 직전 1초의 가상 사용자 수를 남긴다', () => {
    const rows = [초(0, 300, 100, 0, 200), ...Array.from({ length: 10 }, (_, i) => 초(i + 1, 310 + i * 10, 100, 0, 900))];
    expect(autoStop(rows, 'STRESS', [p95목표])).toEqual({ reason: 'TARGET_EXCEEDED', peakVus: 300, atSec: 10 });
    expect(autoStop(rows, 'LOAD', [p95목표])).toBeNull();
  });

  it('벗어남이 10초보다 길게 이어졌으면 처음 벗어난 초 앞의 가상 사용자 수를 남긴다', () => {
    const rows = [초(0, 300, 100, 0, 200), ...Array.from({ length: 13 }, (_, i) => 초(i + 1, 310 + i * 10, 100, 0, 900))];
    expect(autoStop(rows, 'STRESS', [p95목표])).toEqual({ reason: 'TARGET_EXCEEDED', peakVus: 300, atSec: 13 });
  });
});

describe('degraded', () => {
  it('두 실행이 다 지난 100명 단위 칸의 95% 응답시간이 20% 넘게 늘면 성능 저하다', () => {
    const 이전 = [초(0, 150, 100, 0, 200), 초(1, 250, 100, 0, 300)];
    const 지금 = [초(0, 150, 100, 0, 400), 초(1, 260, 100, 0, 900)];
    expect(degraded(지금, 이전)).toBe(true);
    const 비슷 = [초(0, 150, 100, 0, 210), 초(1, 260, 100, 0, 220)];
    expect(degraded(비슷, 이전)).toBe(false);
    expect(degraded(지금, [])).toBeNull();
  });
});

describe('견줌 지점과 트랜잭션별 셈', () => {
  const 이전 = [초(0, 150, 100, 0, 200), 초(1, 250, 100, 0, 300)];
  const 지금 = [초(0, 150, 100, 0, 400), 초(1, 260, 100, 0, 900)];

  it('견줌 지점은 두 실행 최대 가상 사용자 중 작은 값을 100명 단위로 내린 값이고 그 칸의 초를 고른다', () => {
    expect(comparePoint(지금, 이전)).toBe(200);
    expect([...bandSecs(지금, 200)]).toEqual([1]);
    expect([...bandSecs(이전, 200)]).toEqual([1]);
  });

  it('이전 실행이 없으면 95% 와 에러율만 채우고 저하는 아니다', () => {
    const rows = [초(0, 10, 100, 5, 200, '로그인'), 초(0, 10, 50, 0, 100, '목록')];
    const v = transactionViews(['목록', '로그인'], rows, null);
    expect(v.map((x) => x.tx)).toEqual(['목록', '로그인']);
    expect(v[1]).toMatchObject({ errorRate: 5, prevP95Ms: null, degraded: false });
    expect(v[1]?.p95Ms).toBeGreaterThan(150);
  });

  it('이전 실행의 같은 트랜잭션보다 20% 넘게 느리면 그 줄만 성능 저하다', () => {
    const 지금줄 = [초(1, 260, 100, 0, 900, '로그인'), 초(1, 260, 100, 0, 210, '목록')];
    const 이전줄 = [초(1, 250, 100, 0, 300, '로그인'), 초(1, 250, 100, 0, 200, '목록')];
    const v = transactionViews([], 지금줄, 이전줄);
    expect(v.map((x) => [x.tx, x.degraded])).toEqual([['로그인', true], ['목록', false]]);
    expect(v[0]?.prevP95Ms).not.toBeNull();
  });

  it('이전 실행에 없던 트랜잭션은 견주지 못하므로 저하가 아니다', () => {
    const v = transactionViews([], [초(1, 260, 100, 0, 900, '새줄')], [초(1, 250, 100, 0, 300, '다른줄')]);
    expect(v[0]).toMatchObject({ tx: '새줄', prevP95Ms: null, degraded: false });
  });
});
