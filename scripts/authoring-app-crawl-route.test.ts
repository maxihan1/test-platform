// 앱 crawl 결과 → 앱 조작 맵 줄 검사 — 이동 · API 줄 꼴 · 로그아웃 판 표시 · 서버가 받는 꼴 · 나눠 올리기 · 빌드 번호 · 화면 기록
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { 맵줄검사 } from '../apps/admin/src/prd/appRoute.js';
import { 앱크롤올리기, 크롤맵올리기, 크롤맵줄, 크롤빌드번호 } from './authoring-app-crawl-route.js';
import { 경로, 맵읽기, 새줄더하기 } from './authoring-app-route.js';

const 통로 = { 주소기지: 'http://admin:3000', 토큰: 't', 번호: 7 };
const 홈 = 'app:.MainActivity/홈';
const 알림 = 'app:.MainActivity/알림';
const 로그인 = 'app:.LoginActivity/로그인';

let 자료 = '';
beforeEach(() => {
  자료 = mkdtempSync(join(tmpdir(), 'appcrawlroute-'));
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  rmSync(자료, { recursive: true, force: true });
});

const crawl결과 = (links: unknown, apis: unknown) => {
  mkdirSync(join(자료, 'crawl'));
  writeFileSync(join(자료, 'crawl', 'links.json'), JSON.stringify(links));
  writeFileSync(join(자료, 'crawl', 'apis.json'), JSON.stringify(apis));
};

describe('크롤맵줄 — links.json · apis.json → 이동 · API 줄', () => {
  it('누른 버튼은 「버튼」 누르기 이동 줄, 들은 API 는 그 화면의 「방법 주소 틀」 줄이다 — 숫자 칸은 :n 으로 접고 버튼은 짝짓지 않는다', () => {
    const { 줄들, 뺀수 } = 크롤맵줄(
      [{ 상태: '로그인:일반 회원', 틀: 홈, 연결: [{ to: 알림, via: '버튼 「알림」' }] }],
      [{ 상태: '로그인:일반 회원', 틀: 알림, api: [{ method: 'get', url: 'https://m.example.com/api/v1/notifications/123?limit=20' }] }],
      '57',
    );

    expect(뺀수).toBe(0);
    expect(줄들).toEqual([
      { kind: 'MOVE', fromKey: 홈, action: '「알림」 누르기', toKey: 알림, status: 'OK', buildNo: '57' },
      { kind: 'API', fromKey: 알림, action: 'GET /api/v1/notifications/:n', status: 'OK', buildNo: '57' },
    ]);
    expect(맵줄검사({ rows: 줄들 })).not.toHaveProperty('error');
  });

  it('로그아웃 판에서만 본 줄은 칸에 로그아웃을 적고, 두 판에 다 있으면 로그인 판 것 하나다', () => {
    const { 줄들 } = 크롤맵줄(
      [
        { 상태: '로그아웃', 틀: 로그인, 연결: [{ to: 'app:.SignupActivity/가입', via: '버튼 「가입」' }] },
        { 상태: '로그아웃', 틀: 홈, 연결: [{ to: 로그인, via: '버튼 「알림」' }] },
        { 상태: '로그인:일반 회원', 틀: 홈, 연결: [{ to: 알림, via: '버튼 「알림」' }] },
      ],
      [],
    );

    expect(줄들).toEqual([
      { kind: 'MOVE', fromKey: 로그인, action: '「가입」 누르기', toKey: 'app:.SignupActivity/가입', status: 'OK', fields: { 상태: '로그아웃' } },
      { kind: 'MOVE', fromKey: 홈, action: '「알림」 누르기', toKey: 알림, status: 'OK' },
    ]);
    expect(맵줄검사({ rows: 줄들 })).not.toHaveProperty('error');
  });

  it('서버가 거절할 글(「 · 」 · 200자 넘음 · 버튼 꼴이 아님 · http 가 아닌 주소)은 그 줄만 빼고 센다', () => {
    const { 줄들, 뺀수 } = 크롤맵줄(
      [
        {
          상태: '로그인:일반 회원',
          틀: 홈,
          연결: [
            { to: 알림, via: '버튼 「알림 · 3」' },
            { to: 알림, via: `버튼 「${'가'.repeat(200)}」` },
            { to: 알림, via: '링크 알림' },
            { to: 알림, via: '버튼 「알림」' },
          ],
        },
      ],
      [{ 상태: '로그인:일반 회원', 틀: 홈, api: [{ method: 'GET', url: 'content://x' }] }],
    );

    expect(뺀수).toBe(4);
    expect(줄들.map((r) => r.action)).toEqual(['「알림」 누르기']);
    expect(맵줄검사({ rows: 줄들 })).not.toHaveProperty('error');
  });

  it('올린 줄로 경로 검색이 길을 낸다 — 빌드 없는 확인 줄이다', () => {
    const { 줄들 } = 크롤맵줄(
      [
        { 상태: '로그인:일반 회원', 틀: 홈, 연결: [{ to: 알림, via: '버튼 「알림」' }] },
        { 상태: '로그인:일반 회원', 틀: 알림, 연결: [{ to: 'app:.StatusActivity/글 상세', via: '버튼 「첫 알림」' }] },
      ],
      [],
    );

    const 길 = 경로(새줄더하기(맵읽기(''), { rows: 줄들 }), 'app:.StatusActivity/글 상세', 홈);

    expect(길.다찾음).toBe(true);
    expect(길.줄들.join('\n')).toContain('「첫 알림」 누르기');
  });
});

describe('크롤맵올리기 · 크롤빌드번호 · 앱크롤올리기', () => {
  it('crawl 폴더가 없으면 아무것도 안 부른다', async () => {
    const 부름 = vi.fn();
    vi.stubGlobal('fetch', 부름);

    expect(await 앱크롤올리기(통로, 자료, [], undefined, false)).toEqual([]);
    expect(부름).not.toHaveBeenCalled();
  });

  it('2,000줄씩 나눠 PUT 하고 PR 머리 줄에 줄 수 · 빌드를 적는다', async () => {
    crawl결과([{ 상태: '로그인:일반 회원', 틀: 홈, 연결: Array.from({ length: 2_500 }, (_, i) => ({ to: `app:.A/화면 ${String(i)}`, via: `버튼 「버튼 ${String(i)}」` })) }], []);
    const 몸들: { rows: unknown[] }[] = [];
    vi.stubGlobal('fetch', vi.fn(async (_주소: string, 옵션: RequestInit) => (몸들.push(JSON.parse(String(옵션.body)) as { rows: unknown[] }), new Response(null, { status: 204 }))));

    expect(await 크롤맵올리기(통로, 자료, [], '57')).toEqual(['앱 조작 맵: crawl 이동 2500줄 · API 0줄 올림 · 빌드 57']);
    expect(몸들.map((b) => b.rows.length)).toEqual([2_000, 500]);
  });

  it('서버가 거절하면 그 까닭을 줄로 남기고, 비밀번호가 든 줄이면 부르지도 않는다', async () => {
    crawl결과([{ 상태: '로그인:일반 회원', 틀: 홈, 연결: [{ to: 알림, via: '버튼 「Pa55word!」' }] }], []);
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'BAD_ROUTE' }), { status: 400 })));

    expect(await 크롤맵올리기(통로, 자료, [], undefined)).toEqual(['앱 조작 맵: 못 올림 — 서버 400']);
    expect(await 크롤맵올리기(통로, 자료, ['Pa55word!'], undefined)).toEqual(['앱 조작 맵: 올릴 줄에 테스트 계정 비밀번호가 들어 있어 안 올림']);
  });

  it('빌드 번호는 앱 링크의 빌드로 app-link 를 불러 받고, 링크에 빌드가 없으면 부르지 않는다', async () => {
    const 부름 = vi.fn(async () => new Response(JSON.stringify({ app: 'x', buildNo: '1.4.0-57' }), { status: 200 }));
    vi.stubGlobal('fetch', 부름);

    expect(await 크롤빌드번호(통로, 'https://hub.test/api/builds/31/apk?exp=1&sig=a')).toBe('1.4.0-57');
    expect((부름.mock.calls[0] as unknown as [string])[0]).toBe('http://admin:3000/api/authoring/requests/7/app-link?build=31');
    expect(await 크롤빌드번호(통로, 'https://builds/qa.apk')).toBeUndefined();
    expect(부름).toHaveBeenCalledTimes(1);
  });

  it('대조 요청이 아니면 화면 기록도 올리고, 대조 요청은 맵만 올린다(화면 기록은 올리기 단계 몫)', async () => {
    crawl결과([{ 상태: '로그인:일반 회원', 틀: 홈, 연결: [{ to: 알림, via: '버튼 「알림」' }] }], []);
    writeFileSync(join(자료, 'crawl', 'list.json'), '[]');
    writeFileSync(join(자료, 'crawl', 'summary.json'), JSON.stringify({ 멈춘까닭: '--max 50장', 상태들: ['로그인:일반 회원'], 예외: false }));
    const 길들: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (주소: string, 옵션?: RequestInit) => {
        길들.push(`${옵션?.method ?? 'GET'} ${주소.replace('http://admin:3000/api/authoring/requests/7', '')}`);
        if (주소.endsWith('/screens') && (옵션?.method ?? 'GET') === 'GET') return new Response(JSON.stringify({ items: [] }), { status: 200 });
        if (주소.endsWith('/screens/done')) return new Response(JSON.stringify({ deleted: 0 }), { status: 200 });
        return new Response(null, { status: 204 });
      }),
    );

    const 줄 = await 앱크롤올리기(통로, 자료, [], undefined, false);

    expect(길들).toEqual(['GET /screens', 'POST /screens/done', 'PUT /app-route']);
    expect(줄[0]).toMatch(/^화면 기록 저장: /);
    expect(줄[1]).toBe('앱 조작 맵: crawl 이동 1줄 · API 0줄 올림 · 빌드 없음');

    길들.length = 0;
    expect(await 앱크롤올리기(통로, 자료, [], undefined, true)).toEqual(['앱 조작 맵: crawl 이동 1줄 · API 0줄 올림 · 빌드 없음']);
    expect(길들).toEqual(['PUT /app-route']);
  });
});
