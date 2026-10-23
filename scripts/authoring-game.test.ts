// 게임 작성의 앞뒤 — 창 기록 저장본 · 게임 지도 받기, 훑은 창 중 바뀐 것만 올리기 · 못 본 창은 안 지우기 · 비밀번호 든 기록 막기, 게임 지도 요소 올리기
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { 게임올리기, 게임준비 } from './authoring-game.js';

const 통로 = { 주소기지: 'http://admin:3000', 토큰: 't', 번호: 7 };
const 저장된창 = { state: '로그아웃', url: 'game:Login', name: 'Login', textFp: 'bb01', structFp: 'aa01', record: '# scene:Login\n- Button LoginButton\n## 정리\n로그인 창', crawledAt: '2026-10-20T01:00:00Z' };
const 웹화면 = { ...저장된창, url: '/login', record: '# https://shop/login' };

let 자료 = '';
let 부름: ReturnType<typeof vi.fn>;
// 길마다 답을 정해 두고 부른 순서를 남긴다
const 서버 = (답들: Record<string, { status: number; 몸?: unknown }>) => {
  부름 = vi.fn(async (url: string, init?: RequestInit) => {
    const 길 = `${init?.method ?? 'GET'} ${url.replace('http://admin:3000/api/authoring/requests/7', '')}`;
    const 답 = 답들[길] ?? { status: 404, 몸: {} };
    return new Response(답.status === 204 ? null : JSON.stringify(답.몸 ?? {}), { status: 답.status });
  });
  vi.stubGlobal('fetch', 부름);
};
const 보낸몸 = (길: string) =>
  (부름.mock.calls as [string, RequestInit][]).filter(([url, init]) => `${init.method ?? 'GET'} ${url.replace('http://admin:3000', '')}` === 길).map(([, init]) => JSON.parse(init.body as string));

beforeEach(() => {
  자료 = mkdtempSync(join(tmpdir(), 'game-'));
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  rmSync(자료, { recursive: true, force: true });
});

describe('게임준비', () => {
  it('게임 창 기록만 game-kept/ 로 넣고 게임 지도 글을 game-map.txt 로 받는다', async () => {
    서버({ 'GET /screens': { status: 200, 몸: { screens: [저장된창, 웹화면], links: [] } }, 'GET /game-map': { status: 200, 몸: { text: '# 기대값의 근거가 아니다\n## 게임 데이터 (DATA) — 0개' } } });

    await 게임준비(통로, 자료);

    expect(JSON.parse(readFileSync(join(자료, 'game-kept', 'index.json'), 'utf8'))).toEqual([
      { 상태: '로그아웃', 키: 'game:Login', 지문: 'aa01', 글자지문: 'bb01', 훑은날: '2026-10-20', 기록: '001.yml' },
    ]);
    expect(readFileSync(join(자료, 'game-kept', '001.yml'), 'utf8')).toContain('로그인 창');
    expect(readFileSync(join(자료, 'game-map.txt'), 'utf8')).toContain('기대값의 근거가 아니다');
  });

  it('못 받으면 앞 실행이 남긴 저장본 · 지도도 지워 낡은 것을 안 보인다 — 작성은 간다', async () => {
    mkdirSync(join(자료, 'game-kept'));
    writeFileSync(join(자료, 'game-kept', 'index.json'), '[]');
    writeFileSync(join(자료, 'game-map.txt'), '옛 지도');
    서버({});

    await expect(게임준비(통로, 자료)).resolves.toBeUndefined();

    expect(existsSync(join(자료, 'game-kept'))).toBe(false);
    expect(existsSync(join(자료, 'game-map.txt'))).toBe(false);
  });
});

describe('게임올리기', () => {
  const 훑기 = (이름: string, 상태: string | null, 목록: unknown[], 기록들: Record<string, string>) => {
    const 폴더 = join(자료, 'game-crawl', 이름);
    mkdirSync(폴더, { recursive: true });
    writeFileSync(join(폴더, 'list.json'), JSON.stringify(목록));
    if (상태 !== null) writeFileSync(join(폴더, 'game.json'), JSON.stringify({ 상태, 창: [] }));
    for (const [파일, 글] of Object.entries(기록들)) writeFileSync(join(폴더, 파일), 글);
  };
  const 로그인목록 = [
    { 주소: 'scene:Login', 이름: 'Login', 틀: 'scene:Login', 파일: '001.yml', 지문: 'aa01', 글자지문: 'bb01', 연곳: null },
    { 주소: '/Canvas/SignupPanel', 이름: '회원가입', 틀: '/Canvas/SignupPanel', 파일: '002.yml', 지문: 'aa02', 글자지문: 'bb02', 연곳: { 창: 'scene:Login', 버튼: 'SignupButton', 글자: '가입' } },
  ];
  const 기본답 = {
    'GET /screens': { status: 200, 몸: { screens: [저장된창], links: [] } },
    'PUT /screens': { status: 204 },
    'POST /screens/done': { status: 200, 몸: { deleted: 0, viewport: null } },
    'PUT /game-elements': { status: 204 },
  };

  it('지문이 같은 창은 안 올리고 바뀐 · 새 창만 올린 뒤 본 창을 알린다 — 못 본 창은 지우지 않는다', async () => {
    훑기('logout', '로그아웃', 로그인목록, { '001.yml': '# scene:Login', '002.yml': '# /Canvas/SignupPanel\n## 정리\n가입 창' });
    서버(기본답);

    const [창줄] = await 게임올리기(통로, 자료, [], new Date('2026-10-23T00:00:00Z'));

    expect(창줄).toBe('게임 창 기록 저장: 본 창 2개 · 그대로라 재사용 1개 · 새로 저장 1개');
    expect(보낸몸('PUT /api/authoring/requests/7/screens')).toEqual([
      { state: '로그아웃', url: 'game:Login/Canvas/SignupPanel', name: '회원가입', textFp: 'bb02', structFp: 'aa02', record: '# /Canvas/SignupPanel\n## 정리\n가입 창', crawledAt: '2026-10-23T00:00:00.000Z', links: [] },
    ]);
    expect(보낸몸('POST /api/authoring/requests/7/screens/done')).toEqual([
      { seen: [{ state: '로그아웃', url: 'game:Login', name: 'Login' }, { state: '로그아웃', url: 'game:Login/Canvas/SignupPanel', name: '회원가입' }], complete: [] },
    ]);
  });

  it('견주기를 안 한 폴더(game.json 상태 없음)는 건너뛴다', async () => {
    훑기('logout', null, 로그인목록, {});
    서버(기본답);

    expect((await 게임올리기(통로, 자료, []))[0]).toBe('게임 창 기록 저장: 견주기를 마친 훑기 폴더가 없어 건너뜀(폴더 1개)');
    expect(보낸몸('PUT /api/authoring/requests/7/screens')).toEqual([]);
  });

  it('기록에 테스트 계정 비밀번호가 들어 있으면 하나도 안 올린다', async () => {
    훑기('login', '로그인:일반 회원', 로그인목록, { '001.yml': '# scene:Login\n- InputField Pw "Secret!123"', '002.yml': '# 가입' });
    서버(기본답);

    expect((await 게임올리기(통로, 자료, ['Secret!123']))[0]).toBe('게임 창 기록 저장: 기록에 테스트 계정 비밀번호가 들어 있어 올리지 않음');
    expect(보낸몸('PUT /api/authoring/requests/7/screens')).toEqual([]);
    expect(보낸몸('POST /api/authoring/requests/7/screens/done')).toEqual([]);
  });

  it('게임 지도 요소 파일을 그대로 올리고 서버가 틀린 자리를 말하면 줄에 싣는다', async () => {
    const 요소 = { elements: [{ kind: 'DATA', key: 'item:sword_long', name: '장검', value: { 공격력: 14 }, reqIds: ['REQ-ITEM-001'] }], remove: ['item:old'] };
    writeFileSync(join(자료, 'game-elements.json'), JSON.stringify(요소));
    서버(기본답);

    expect((await 게임올리기(통로, 자료, []))[1]).toBe('게임 지도: 요소 1개 올림 · 1개 지움');
    expect(보낸몸('PUT /api/authoring/requests/7/game-elements')).toEqual([요소]);

    서버({ ...기본답, 'PUT /game-elements': { status: 400, 몸: { error: 'BAD_ELEMENT', detail: 'elements.0.key' } } });
    expect((await 게임올리기(통로, 자료, []))[1]).toBe('게임 지도: 못 올림 — 서버 400 (elements.0.key)');
  });

  it('게임 지도 요소 파일이 없거나 비밀번호가 들었으면 안 올리고 줄에 적는다', async () => {
    서버(기본답);
    expect((await 게임올리기(통로, 자료, []))[1]).toBe('게임 지도: game-elements.json 이 없어 안 올림');

    writeFileSync(join(자료, 'game-elements.json'), JSON.stringify({ elements: [{ kind: 'STATE', key: 'state:x', name: 'Secret!123' }] }));
    expect((await 게임올리기(통로, 자료, ['Secret!123']))[1]).toBe('게임 지도: 테스트 계정 비밀번호가 들어 있어 안 올림');
    expect(보낸몸('PUT /api/authoring/requests/7/game-elements')).toEqual([]);
  });
});
