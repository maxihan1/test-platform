// 더미 클라이언트 결과 줄 읽기 · 계획 사용자 수 · 1초 묶기의 순수 셈

import { describe, expect, it } from 'vitest';

import { DummySeconds, parseLine, parseStages, plannedVus } from './dummySeconds.js';
import { HIST_BUCKETS, bucketOf } from './hist.js';

describe('parseLine', () => {
  it('꼴이 맞는 줄만 읽고 깨진 줄 · 꼴이 틀린 줄은 버린다', () => {
    expect(parseLine('{"t": 1000, "tx": "로그인", "ms": 12.5, "ok": true}')).toEqual({ t: 1000, tx: '로그인', ms: 12.5, ok: true });
    for (const bad of ['', '로그 한 줄', '{', '{"t": "1", "tx": "a", "ms": 1, "ok": true}', '{"t": 1, "tx": "", "ms": 1, "ok": true}', '{"t": 1, "tx": "a", "ms": -1, "ok": true}', '{"t": 1, "tx": "a", "ms": 1, "ok": "yes"}', 'null', '{"t": 1, "tx": "a", "ms": 1}']) {
      expect(parseLine(bad)).toBeNull();
    }
  });
});

describe('plannedVus', () => {
  const stages = [{ durationSec: 10, target: 10 }, { durationSec: 10, target: 4 }];

  it('0 에서 단계마다 선형으로 오르내리고 그 초가 끝나는 때의 값을 반올림한다', () => {
    expect([0, 4, 9].map((s) => plannedVus(stages, s))).toEqual([1, 5, 10]);
    expect([10, 14, 19].map((s) => plannedVus(stages, s))).toEqual([9, 7, 4]);
  });

  it('단계가 끝난 뒤는 0 이다', () => {
    expect(plannedVus(stages, 20)).toBe(0);
  });
});

describe('parseStages', () => {
  it('JSON 단계를 읽고, 깨졌거나 없으면 사용자 수를 실행 시간 내내 두는 한 단계로 본다', () => {
    expect(parseStages('[{"durationSec":5,"target":2}]', 9, 60)).toEqual([{ durationSec: 5, target: 2 }]);
    for (const bad of [undefined, '', '{', '[]', '[{"durationSec":0,"target":1}]', '[{"target":1}]']) {
      expect(parseStages(bad, 3, 60)).toEqual([{ durationSec: 60, target: 3 }]);
    }
  });
});

describe('DummySeconds', () => {
  const line = (t: number, tx: string, ms: number, ok = true) => JSON.stringify({ t, tx, ms, ok });

  it('초 · 트랜잭션별로 요청 수 · 에러 수 · 분포를 묶고 vus 는 계획값이다', () => {
    const s = new DummySeconds(10_000, [{ durationSec: 4, target: 4 }]);
    s.add(line(10_100, 'login', 10));
    s.add(line(10_900, 'login', 20, false));
    s.add(line(10_950, 'move', 5));
    s.add(line(11_000, 'login', 30));
    s.add('깨진 줄');
    const first = s.take(0);
    expect(first).toMatchObject({ sec: 0, vus: 1 });
    expect(first.txs).toHaveLength(2);
    expect(first.txs.find((t) => t.name === 'login')).toMatchObject({ requests: 2, errors: 1 });
    expect(first.txs.find((t) => t.name === 'login')!.hist).toHaveLength(HIST_BUCKETS);
    expect(first.txs.find((t) => t.name === 'login')!.hist[bucketOf(10)]).toBe(1);
    expect(s.take(1)).toMatchObject({ sec: 1, vus: 2, txs: [{ name: 'login', requests: 1, errors: 0 }] });
    expect(s.take(2)).toEqual({ sec: 2, vus: 3, txs: [] });
  });

  it('실행 시간 + 60초 뒤의 시각 · 200자 넘는 이름 · 한 초 500번째 뒤의 새 이름은 버린다', () => {
    const s = new DummySeconds(10_000, [{ durationSec: 4, target: 4 }]);
    s.add(line(10_000 + 65_000, 'a', 1));
    s.add(line(1.7e15, 'a', 1));
    expect(s.leftovers()).toEqual([]);
    s.add(line(10_100, 'x'.repeat(201), 1));
    for (let i = 0; i < 501; i += 1) s.add(line(10_100, `tx${i}`, 1));
    s.add(line(10_100, 'tx0', 1));
    const first = s.take(0);
    expect(first.txs).toHaveLength(500);
    expect(first.txs.find((t) => t.name === 'tx0')!.requests).toBe(2);
  });

  it('시작 전 시각은 0초로 세고, 보낸 초에 늦게 온 조각은 vus 0 으로 leftovers 에 남는다', () => {
    const s = new DummySeconds(10_000, [{ durationSec: 4, target: 4 }]);
    s.add(line(9_000, 'a', 1));
    expect(s.leftovers()).toEqual([0]);
    s.take(0);
    s.add(line(10_500, 'a', 1));
    expect(s.leftovers()).toEqual([0]);
    expect(s.take(0)).toMatchObject({ sec: 0, vus: 0, txs: [{ name: 'a', requests: 1 }] });
    expect(s.leftovers()).toEqual([]);
  });
});
