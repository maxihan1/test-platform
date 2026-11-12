// 웹 항목 판정이 센다 / 안 센다 표대로 고르고 같은 지문을 묶는지 본다
import { describe, expect, it } from 'vitest';

import { 예외축인가, 웹항목오류, type 네트워크줄, type 콘솔줄 } from './webJudge.js';

const 대상 = 'https://m.demo.com/login';

const 줄 = (n: Partial<네트워크줄> & Pick<네트워크줄, 'ord' | 'url'>): 네트워크줄 => ({
  seq: 1, atMs: n.ord * 100, method: 'GET', status: 200, resourceType: 'fetch', failure: null, ...n,
});
const 콘솔 = (c: Partial<콘솔줄> & Pick<콘솔줄, 'ord' | 'level' | 'text'>): 콘솔줄 => ({ seq: 1, atMs: c.ord * 100, url: null, ...c });

describe('웹항목오류', () => {
  it('pageerror · error 는 세고 warning 은 안 센다', () => {
    const r = 웹항목오류([
      콘솔({ ord: 1, level: 'pageerror', text: 'TypeError: x is undefined' }),
      콘솔({ ord: 2, level: 'error', text: '저장 실패' }),
      콘솔({ ord: 3, level: 'warning', text: '느림' }),
    ], [], false, 대상);
    expect(r.map((x) => x.source)).toEqual(['WEB_PAGEERROR', 'WEB_CONSOLE']);
  });

  it('메아리 콘솔 줄은 축과 상관없이 빼고 네트워크 실패 줄로 한 번 센다', () => {
    const 네트워크 = [줄({ ord: 1, url: 'https://m.demo.com/api/me', status: 500 })];
    const r = 웹항목오류([
      콘솔({ ord: 1, level: 'error', text: 'Failed to load resource: the server responded with a status of 500 ()' }),
      콘솔({ ord: 2, level: 'error', text: '알 수 없는 오류', url: 'https://m.demo.com/api/me' }),
    ], 네트워크, false, 대상);
    expect(r.map((x) => x.title)).toEqual(['HTTP 500 · GET /api/me']);
    expect(웹항목오류([콘솔({ ord: 1, level: 'error', text: 'Failed to load resource' })], 네트워크, true, 대상)).toEqual([]);
  });

  it('예외 축 케이스는 네트워크 실패 줄만 빼고 잡히지 않은 오류는 센다', () => {
    const r = 웹항목오류(
      [콘솔({ ord: 1, level: 'pageerror', text: 'Error: 터짐' })],
      [줄({ ord: 1, url: 'https://m.demo.com/api/login', method: 'POST', status: 401 })],
      true,
      대상,
    );
    expect(r.map((x) => x.source)).toEqual(['WEB_PAGEERROR']);
  });

  it('4xx · 5xx · 응답 없는 끊김은 세고 3xx 이하는 안 센다', () => {
    const r = 웹항목오류([], [
      줄({ ord: 1, url: 'https://m.demo.com/a', status: 302 }),
      줄({ ord: 2, url: 'https://m.demo.com/b', status: 404 }),
      줄({ ord: 3, url: 'https://m.demo.com/c', status: null, failure: 'net::ERR_ABORTED' }),
      줄({ ord: 4, url: 'https://m.demo.com/d', status: null }),
    ], false, 대상);
    expect(r.map((x) => x.title)).toEqual(['HTTP 404 · GET /b', '요청 끊김 · GET /c']);
  });

  it('같은 지문은 횟수만 더하고 첫 단계 · 화면을 남긴다', () => {
    const r = 웹항목오류([], [
      줄({ ord: 1, url: 'https://m.demo.com/home', resourceType: 'document' }),
      줄({ ord: 2, seq: 2, url: 'https://m.demo.com/api/items/1', status: 500 }),
      줄({ ord: 3, seq: 3, url: 'https://m.demo.com/api/items/2', status: 500 }),
    ], false, 대상);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ hits: 2, seq: 2, page: 'https://m.demo.com/home', sample: 'GET https://m.demo.com/api/items/1 → 500' });
  });

  it('화면 주소는 그 줄 앞의 페이지 이동이고 없으면 대상 주소의 / 다', () => {
    const r = 웹항목오류(
      [콘솔({ ord: 1, level: 'error', text: '앞', atMs: 50 }), 콘솔({ ord: 2, level: 'error', text: '뒤', atMs: 500 })],
      [줄({ ord: 1, atMs: 100, url: 'https://m.demo.com/settings', resourceType: 'document' })],
      false,
      대상,
    );
    expect(r.map((x) => x.page)).toEqual(['https://m.demo.com/', 'https://m.demo.com/settings']);
  });

  it('견본은 8,000자에서 자른다', () => {
    const r = 웹항목오류([콘솔({ ord: 1, level: 'pageerror', text: 'x'.repeat(9_000) })], [], false, 대상);
    expect(r[0]!.sample).toHaveLength(8_000);
  });
});

describe('예외축인가', () => {
  it('축 하나라도 예외면 예외다', () => {
    expect(예외축인가(['정상', '예외'])).toBe(true);
    expect(예외축인가(['정상', '경계'])).toBe(false);
  });
});
