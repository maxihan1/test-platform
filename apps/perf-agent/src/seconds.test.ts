// k6 2.3.0 JSON 출력 줄을 1초 · 트랜잭션별로 바르게 묶는지 본다. 줄 꼴은 k6 2.3.0 실측 그대로다

import { describe, expect, it } from 'vitest';

import { bucketOf } from './hist.js';
import { Seconds } from './seconds.js';

const START = Date.parse('2026-10-21T05:00:00.000Z');
const at = (ms: number) => new Date(START + ms).toISOString();
const point = (metric: string, ms: number, value: number, tags: Record<string, string> = {}) =>
  JSON.stringify({ metric, type: 'Point', data: { time: at(ms), value, tags } });

describe('Seconds', () => {
  it('요청 수 · 에러 수 · 분포 · 가상 사용자를 초와 트랜잭션별로 센다', () => {
    const s = new Seconds(START);
    s.add('{"type":"Metric","data":{"name":"http_req_duration","type":"trend"},"metric":"http_req_duration"}');
    s.add(point('vus', 100, 5));
    s.add(point('http_req_duration', 200, 12, { tx: 'login' }));
    s.add(point('http_req_failed', 200, 0, { tx: 'login' }));
    s.add(point('http_req_duration', 300, 250, { tx: 'login' }));
    s.add(point('http_req_failed', 300, 1, { tx: 'login' }));
    s.add(point('checks', 400, 0, { tx: 'login' }));
    s.add(point('checks', 400, 1, { tx: 'login' }));
    s.add(point('http_req_duration', 500, 40, { tx: 'list' }));
    s.add(point('http_reqs', 500, 1, { tx: 'list' }));
    s.add(point('http_req_duration', 1500, 30, { tx: 'login' }));

    const first = s.take(0);
    expect(first.vus).toBe(5);
    const login = first.txs.find((t) => t.name === 'login')!;
    expect(login.requests).toBe(2);
    expect(login.errors).toBe(2);
    expect(login.hist[bucketOf(12)]).toBe(1);
    expect(login.hist[bucketOf(250)]).toBe(1);
    expect(login.hist.reduce((a, b) => a + b, 0)).toBe(2);
    expect(first.txs.find((t) => t.name === 'list')!.requests).toBe(1);
    expect(s.take(1).txs[0]).toMatchObject({ name: 'login', requests: 1, errors: 0 });
  });

  it('줄이 없던 초도 빈 숫자로 꺼내고, 꼬리표 없는 요청은 세지 않는다', () => {
    const s = new Seconds(START);
    s.add(point('http_req_duration', 100, 12));
    expect(s.take(0)).toEqual({ sec: 0, vus: 0, txs: [] });
    expect(s.take(7)).toEqual({ sec: 7, vus: 0, txs: [] });
  });

  it('꺼낸 초에 늦게 온 줄은 남은 칸으로 다시 보인다', () => {
    const s = new Seconds(START);
    s.take(0);
    s.add(point('http_req_duration', 900, 12, { tx: 'login' }));
    expect(s.leftovers()).toEqual([0]);
    expect(s.take(0).txs[0].requests).toBe(1);
    expect(s.leftovers()).toEqual([]);
  });

  it('늦게 온 조각의 가상 사용자는 0 이라 QA Hub 가 더해도 두 번 세지 않는다', () => {
    const s = new Seconds(START);
    s.add(point('vus', 100, 5));
    expect(s.take(0).vus).toBe(5);
    s.add(point('vus', 900, 5));
    s.add(point('http_req_duration', 900, 12, { tx: 'login' }));
    expect(s.take(0)).toMatchObject({ vus: 0, txs: [{ requests: 1 }] });
  });
});
