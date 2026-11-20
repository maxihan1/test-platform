// 앱 crawl 결과 → 앱 조작 맵 줄 검사 — 이동 · API 줄 꼴 · 판 표시 · 서버가 받는 꼴 · 나눠 올리기 · 다시 안 올리기 · 화면 기록
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { 맵줄검사 } from '../apps/admin/src/prd/appRoute.js';
import { 앱크롤올리기, 크롤맵올리기, 크롤맵줄, 크롤화면옮기기 } from './authoring-app-crawl-route.js';
import { 경로, 맵읽기, 새줄더하기 } from './authoring-app-route.js';

const 통로 = { 주소기지: 'http://admin:3000', 토큰: 't', 번호: 7 };
const 홈 = 'app:.MainActivity/홈';
const 알림 = 'app:.MainActivity/알림';
const 로그인 = 'app:.LoginActivity/로그인';
const 회원 = '로그인:일반 회원';

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

const crawl결과 = (색인: unknown) => {
  mkdirSync(join(자료, 'crawl'), { recursive: true });
  writeFileSync(join(자료, 'crawl', 'index.json'), JSON.stringify(색인));
};
const 받는서버 = () => {
  const 몸들: { rows: { kind: string }[] }[] = [];
  vi.stubGlobal('fetch', vi.fn(async (_주소: string, 옵션: RequestInit) => (몸들.push(JSON.parse(String(옵션.body)) as { rows: { kind: string }[] }), new Response(null, { status: 204 }))));
  return 몸들;
};

describe('크롤맵줄 — index.json → 이동 · API 줄', () => {
  it('누른 버튼은 「버튼」 누르기 이동 줄, 들은 API 는 그 화면의 「방법 주소 틀」 줄이다 — 숫자 칸은 :n 으로 접고 버튼은 짝짓지 않는다', () => {
    const { 줄들, 뺀수 } = 크롤맵줄(
      {
        links: [{ 상태: 회원, from: 홈, to: 알림, via: '버튼 「알림」' }],
        screens: [{ 상태: 회원, key: 알림, apis: [{ method: 'get', url: 'https://m.example.com/api/v1/notifications/123?limit=20' }] }],
      },
      '57',
    );

    expect(뺀수).toBe(0);
    expect(줄들).toEqual([
      { kind: 'MOVE', fromKey: 홈, action: '「알림」 누르기', toKey: 알림, status: 'OK', buildNo: '57', fields: { 상태: '로그인' } },
      { kind: 'API', fromKey: 알림, action: 'GET /api/v1/notifications/:n', status: 'OK', buildNo: '57', fields: { 상태: '로그인' } },
    ]);
    expect(맵줄검사({ rows: 줄들 })).not.toHaveProperty('error');
  });

  it('판을 늘 적고, 두 판에 다 있으면 로그인 판 것 하나다 — 로그인 판에도 있는 키의 로그아웃 화면 길도 로그아웃으로 남는다', () => {
    const { 줄들 } = 크롤맵줄(
      {
        links: [
          { 상태: '로그아웃', from: 홈, to: 로그인, via: '버튼 「로그인」' },
          { 상태: '로그아웃', from: 홈, to: 로그인, via: '버튼 「알림」' },
          { 상태: 회원, from: 홈, to: 알림, via: '버튼 「알림」' },
        ],
        screens: [],
      },
    );

    expect(줄들).toEqual([
      { kind: 'MOVE', fromKey: 홈, action: '「로그인」 누르기', toKey: 로그인, status: 'OK', fields: { 상태: '로그아웃' } },
      { kind: 'MOVE', fromKey: 홈, action: '「알림」 누르기', toKey: 알림, status: 'OK', fields: { 상태: '로그인' } },
    ]);
    expect(맵줄검사({ rows: 줄들 })).not.toHaveProperty('error');
  });

  it('서버가 거절할 글(「 · 」 · 200자 넘음 · 버튼 꼴이 아님 · http 가 아닌 주소)은 그 줄만 빼고 센다', () => {
    const { 줄들, 뺀수 } = 크롤맵줄({
      links: [
        { 상태: 회원, from: 홈, to: 알림, via: '버튼 「알림 · 3」' },
        { 상태: 회원, from: 홈, to: 알림, via: `버튼 「${'가'.repeat(200)}」` },
        { 상태: 회원, from: 홈, to: 알림, via: '링크 알림' },
        { 상태: 회원, from: 홈, to: 알림, via: '버튼 「알림」' },
      ],
      screens: [{ 상태: 회원, key: 홈, apis: [{ method: 'GET', url: 'content://x' }] }],
    });

    expect(뺀수).toBe(4);
    expect(줄들.map((r) => r.action)).toEqual(['「알림」 누르기']);
  });

  it('올린 줄로 경로 검색이 길을 낸다', () => {
    const { 줄들 } = 크롤맵줄({
      links: [
        { 상태: 회원, from: 홈, to: 알림, via: '버튼 「알림」' },
        { 상태: 회원, from: 알림, to: 'app:.StatusActivity/글 상세', via: '버튼 「첫 알림」' },
      ],
    });

    const 길 = 경로(새줄더하기(맵읽기(''), { rows: 줄들 }), 'app:.StatusActivity/글 상세', 홈);

    expect(길.다찾음).toBe(true);
    expect(길.줄들.join('\n')).toContain('「첫 알림」 누르기');
  });
});

describe('크롤맵올리기 · 앱크롤올리기', () => {
  it('crawl 폴더가 없으면 아무것도 안 부른다', async () => {
    const 부름 = vi.fn();
    vi.stubGlobal('fetch', 부름);

    expect(await 앱크롤올리기(통로, 자료, [], undefined, false)).toEqual([]);
    expect(부름).not.toHaveBeenCalled();
  });

  it('한 본문을 4MiB 아래로 나눠 PUT 하고 PR 머리 줄에 줄 수 · 실제로 실은 빌드를 적는다', async () => {
    crawl결과({ links: Array.from({ length: 6_000 }, (_, i) => ({ 상태: 회원, from: 홈, to: `app:.A/${'화'.repeat(150)} ${String(i)}`, via: `버튼 「${'버'.repeat(55)} ${String(i)}」` })) });
    const 몸들 = 받는서버();

    expect(await 크롤맵올리기(통로, 자료, [], '57')).toEqual(['앱 조작 맵: crawl 이동 6000줄 · API 0줄 올림 · 빌드 57']);
    expect(몸들.length).toBeGreaterThan(1);
    expect(몸들.every((b) => Buffer.byteLength(JSON.stringify(b)) < 4 * 1024 * 1024 && b.rows.length <= 5_000)).toBe(true);
    expect(몸들.flatMap((b) => b.rows)).toHaveLength(6_000);

    expect(await 크롤맵올리기(통로, 자료, [], '1.4.0 · hotfix')).toEqual(['앱 조작 맵: crawl 이동 6000줄 · API 0줄 올림 · 빌드 없음']);
  });

  it('서버가 거절하면 그 까닭을 줄로 남기고, 비밀번호가 든 줄이면 부르지도 않는다', async () => {
    crawl결과({ links: [{ 상태: 회원, from: 홈, to: 알림, via: '버튼 「Pa55word!」' }] });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'BAD_ROUTE' }), { status: 400 })));

    expect(await 크롤맵올리기(통로, 자료, [], undefined)).toEqual(['앱 조작 맵: 못 올림 — 서버 400']);
    expect(await 크롤맵올리기(통로, 자료, ['Pa55word!'], undefined)).toEqual(['앱 조작 맵: 올릴 줄에 테스트 계정 비밀번호가 들어 있어 안 올림']);
  });

  it('한 번 올린 crawl 결과는 이어하기가 다시 안 올리고, crawl 을 다시 돌려 결과가 바뀌면 올린다', async () => {
    crawl결과({ links: [{ 상태: 회원, from: 홈, to: 알림, via: '버튼 「알림」' }] });
    const 몸들 = 받는서버();

    expect(await 앱크롤올리기(통로, 자료, [], '57', true)).toEqual(['앱 조작 맵: crawl 이동 1줄 · API 0줄 올림 · 빌드 57']);
    expect(await 앱크롤올리기(통로, 자료, [], '58', true)).toEqual(['앱 조작 맵: 앞 실행이 올린 crawl 결과라 다시 안 올림']);
    expect(몸들).toHaveLength(1);

    utimesSync(join(자료, 'crawl', 'index.json'), new Date(), new Date(Date.now() + 60_000));
    expect(await 앱크롤올리기(통로, 자료, [], '58', true)).toEqual(['앱 조작 맵: crawl 이동 1줄 · API 0줄 올림 · 빌드 58']);
  });

  it('대조 요청이 아니면 crawl 화면 파일을 화면 기록 자리로 옮겨 올리고, 대조 요청은 맵만 올린다(화면 기록은 올리기 단계 몫)', async () => {
    crawl결과({ links: [{ 상태: 회원, from: 홈, to: 알림, via: '버튼 「알림」' }] });
    mkdirSync(join(자료, 'crawl', '로그인'));
    writeFileSync(join(자료, 'crawl', '로그인', '002.yml'), `# ${알림}\n알림 화면\n`);
    writeFileSync(join(자료, 'crawl', 'list.json'), JSON.stringify([{ 주소: 알림, 이름: '알림', 상태: 회원, 파일: '로그인/002.yml', 틀: 알림, 지문: 'a', 글자지문: 'b' }]));
    const 길들: string[] = [];
    const 화면몸: unknown[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (주소: string, 옵션?: RequestInit) => {
        const 방법 = 옵션?.method ?? 'GET';
        길들.push(`${방법} ${주소.replace('http://admin:3000/api/authoring/requests/7', '')}`);
        if (주소.endsWith('/screens') && 방법 === 'GET') return new Response(JSON.stringify({ screens: [] }), { status: 200 });
        if (주소.endsWith('/screens') && 방법 === 'PUT') 화면몸.push(JSON.parse(String(옵션?.body)));
        if (주소.endsWith('/screens/done')) return new Response(JSON.stringify({ deleted: 0 }), { status: 200 });
        return new Response(null, { status: 204 });
      }),
    );

    const 줄 = await 앱크롤올리기(통로, 자료, [], undefined, false);

    expect(readFileSync(join(자료, 'screens', 'in-002.md'), 'utf8')).toBe(`# ${알림}\n알림 화면\n`);
    expect(길들).toEqual(['GET /screens', 'PUT /screens', 'POST /screens/done', 'PUT /app-route']);
    expect(화면몸).toEqual([expect.objectContaining({ state: 회원, url: 알림 })]);
    expect(줄).toEqual([expect.stringMatching(/^화면 기록 저장: 재사용 0장 · 새로 저장 1장/), '앱 조작 맵: crawl 이동 1줄 · API 0줄 올림 · 빌드 없음']);

    rmSync(join(자료, 'crawl-uploaded.txt'));
    rmSync(join(자료, 'screens'), { recursive: true });
    길들.length = 0;
    expect(await 앱크롤올리기(통로, 자료, [], undefined, true)).toEqual(['앱 조작 맵: crawl 이동 1줄 · API 0줄 올림 · 빌드 없음']);
    expect(길들).toEqual(['PUT /app-route']);
    expect(existsSync(join(자료, 'screens'))).toBe(false);
  });

  it('크롤화면옮기기 — 저장본과 같은 화면 · 이미 있는 기록 · 판 폴더 밖 파일은 건드리지 않는다', () => {
    mkdirSync(join(자료, 'crawl', '로그아웃'), { recursive: true });
    mkdirSync(join(자료, 'screens'));
    writeFileSync(join(자료, 'crawl', '로그아웃', '001.yml'), '# app:.A/첫\n');
    writeFileSync(join(자료, 'crawl', '로그아웃', '003.yml'), '# app:.A/셋\n');
    writeFileSync(join(자료, 'screens', 'out-003.md'), 'AI 가 쓴 기록');
    writeFileSync(
      join(자료, 'crawl', 'list.json'),
      JSON.stringify([
        { 파일: '로그아웃/001.yml', 저장본: '같음' },
        { 파일: '로그아웃/003.yml' },
        { 파일: '../../etc/passwd' },
      ]),
    );

    크롤화면옮기기(자료);

    expect(existsSync(join(자료, 'screens', 'out-001.md'))).toBe(false);
    expect(readFileSync(join(자료, 'screens', 'out-003.md'), 'utf8')).toBe('AI 가 쓴 기록');
  });
});
