// 화면 기록 저장본 껍데기 검사 — 서버에서 kept/ 로 넣기 · 이번에 본 화면만 올리기 · 다 본 상태 · 비밀번호 · 링크를 따라가지 않기 (도메인/작성 §3.6 「★ 역방향」 · PRD-F6-01)
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { 저장본넣기, 저장본올리기 } from './authoring-screens-keep-io.js';
import { 저장이름 } from './authoring-screens-keep.js';

const 통로 = { 주소기지: 'http://admin:3000', 토큰: 't', 번호: 7 };
const 지금 = new Date('2026-10-20T03:00:00.000Z');
type 건것 = { url: string; method: string; body: unknown };

let 폴더 = '';
let 자료 = '';
let 건것들: 건것[] = [];
function 서버(답: (x: 건것) => { status: number; 몸?: unknown }) {
  vi.stubGlobal('fetch', async (url: string, init: { method?: string; body?: string }) => {
    const x = { url, method: init.method ?? 'GET', body: init.body === undefined ? undefined : JSON.parse(init.body) };
    건것들.push(x);
    const r = 답(x);
    return new Response(r.status === 204 ? null : JSON.stringify(r.몸 ?? {}), { status: r.status });
  });
}
const 서버기록 = (state: string, url: string, 주소: string, crawledAt: string) => ({ state, url, name: url, textFp: 'd', structFp: 'c', record: `# ${주소}\n기록`, crawledAt });
const 다봄답 = (저장: object[] = []) => (x: 건것) =>
  x.method === 'GET' ? { status: 200, 몸: { screens: 저장, links: [] } } : x.method === 'PUT' ? { status: 204 } : { status: 200, 몸: { deleted: 1 } };

beforeEach(() => {
  폴더 = mkdtempSync(join(tmpdir(), 'keep-'));
  자료 = join(폴더, 'assets');
  mkdirSync(join(자료, 'crawl'), { recursive: true });
  mkdirSync(join(자료, 'screens'), { recursive: true });
  건것들 = [];
});
afterEach(() => {
  vi.unstubAllGlobals();
  rmSync(폴더, { recursive: true, force: true });
});

function 크롤쓰기(목록: object[], 요약: object = { 멈춘까닭: null, 따라가기: true, 상태들: ['로그아웃'], 예외: false }) {
  writeFileSync(join(자료, 'crawl', 'list.json'), JSON.stringify(목록));
  writeFileSync(join(자료, 'crawl', 'summary.json'), JSON.stringify(요약));
}
const 홈 = { 주소: 'https://s.test/', 이름: '홈', 상태: '로그아웃', 틀: '/', 지문: 'aaaaaaaaaaaa', 글자지문: 'bbbbbbbbbbbb' };
const 로그인화면 = { 주소: 'https://s.test/login', 이름: '로그인', 상태: '로그아웃', 틀: '/login', 지문: 'cccccccccccc', 글자지문: 'dddddddddddd' };

describe('저장본넣기', () => {
  it('서버 화면 기록을 kept/ 로 넣는다 — 크롤러가 읽는 index.json 과 기록 파일', async () => {
    서버(() => ({ status: 200, 몸: { screens: [{ state: '로그인', url: '/board/:n', name: '글', textFp: 'g', structFp: 'a', record: '# https://s.test/board/3\n글', crawledAt: '2026-10-01T00:00:00.000Z' }], links: [] } }));
    expect(await 저장본넣기(통로, 자료)).toBe(1);
    expect(건것들.map((x) => `${x.method} ${x.url}`)).toEqual(['GET http://admin:3000/api/authoring/requests/7/screens']);
    const 기록 = 저장이름('로그인', '/board/:n');
    expect(readdirSync(join(자료, 'kept')).sort()).toEqual([기록, 'index.json'].sort());
    expect(JSON.parse(readFileSync(join(자료, 'kept', 'index.json'), 'utf8')).항목[0]).toMatchObject({ 틀: '/board/:n', 주소: 'https://s.test/board/3', 훑은날: '2026-10-01' });
  });

  it('이어받기는 있는 kept/ 를 그대로 둔다 · 서버가 실패하면 넣지 않고 작성은 간다', async () => {
    서버(() => ({ status: 500 }));
    expect(await 저장본넣기(통로, 자료)).toBe(0);
    expect(readdirSync(자료)).not.toContain('kept');
    mkdirSync(join(자료, 'kept'));
    건것들 = [];
    expect(await 저장본넣기(통로, 자료, true)).toBe(0);
    expect(건것들).toEqual([]);
  });
});

describe('저장본올리기', () => {
  it('이번에 본 화면만 올린다 — 같음으로 재사용한 화면은 안 올리고 본 것으로 넘긴다 · 다 본 상태만 지우게 한다', async () => {
    크롤쓰기([홈, { ...로그인화면, 저장본: '같음', 저장기록: 'out-x.md' }], { 멈춘까닭: null, 따라가기: true, 상태들: ['로그아웃'], 예외: false });
    writeFileSync(join(자료, 'screens', 'out-001.md'), '# https://s.test/\n홈 기록');
    writeFileSync(join(자료, 'screens', 'out-002.md'), '# https://s.test/login\n재사용해 복사한 기록');
    // 자식이 kept/ 의 훑은 날을 오늘로 고쳐도 날수는 서버 저장본에서 센다
    mkdirSync(join(자료, 'kept'));
    const 고친것 = { 키: '로그아웃 /login', 상태: '로그아웃', 틀: '/login', 주소: 'https://s.test/login', 지문: 'c', 글자지문: 'd', 기록: 저장이름('로그아웃', '/login'), 훑은날: '2026-10-20' };
    writeFileSync(join(자료, 'kept', 'index.json'), JSON.stringify({ 판: 1, 항목: [고친것] }));
    서버(다봄답([서버기록('로그아웃', '/login', 'https://s.test/login', '2026-10-04T09:00:00.000Z'), 서버기록('로그아웃', '/old', 'https://s.test/old', '2026-09-01T00:00:00.000Z')]));
    const r = await 저장본올리기(통로, 자료, true, 'pw-1234', 지금);
    expect(r).toEqual({ 줄: '화면 기록 저장: 재사용 1장(가장 오래된 것 16일) · 새로 저장 1장 · 다 봐서 로그아웃 못 본 화면 1장 지움' });
    expect(건것들).toEqual([
      { url: 'http://admin:3000/api/authoring/requests/7/screens', method: 'GET', body: undefined },
      {
        url: 'http://admin:3000/api/authoring/requests/7/screens',
        method: 'PUT',
        body: { state: '로그아웃', url: '/', name: '홈', textFp: 'bbbbbbbbbbbb', structFp: 'aaaaaaaaaaaa', record: '# https://s.test/\n홈 기록', crawledAt: '2026-10-20T03:00:00.000Z', links: [] },
      },
      {
        url: 'http://admin:3000/api/authoring/requests/7/screens/done',
        method: 'POST',
        body: { seen: [{ state: '로그아웃', url: '/' }, { state: '로그아웃', url: '/login' }], complete: ['로그아웃'] },
      },
    ]);
  });

  it('대조 · 크롤이 멈춤 · 예외면 아무것도 안 지우게 한다', async () => {
    writeFileSync(join(자료, 'screens', 'out-001.md'), '# https://s.test/\n홈 기록');
    서버(다봄답());
    for (const [화면만, 요약] of [
      [false, { 멈춘까닭: null, 따라가기: true, 상태들: ['로그아웃'], 예외: false }],
      [true, { 멈춘까닭: '로그아웃 몫 시간', 따라가기: true, 상태들: ['로그아웃'] }],
      [true, { 멈춘까닭: null, 따라가기: true, 상태들: ['로그아웃', '로그인'], 예외: true }],
    ] as const) {
      크롤쓰기([홈], 요약);
      건것들 = [];
      expect(await 저장본올리기(통로, 자료, 화면만, null, 지금)).toEqual({ 줄: '화면 기록 저장: 재사용 0장 · 새로 저장 1장' });
      expect(건것들.at(-1)?.body).toMatchObject({ complete: [] });
    }
  });

  it('올릴 기록의 본문 · 이름에 테스트 계정 비밀번호가 있으면 하나도 안 올리고 거절한다', async () => {
    writeFileSync(join(자료, 'screens', 'out-001.md'), '# https://s.test/\n홈 기록');
    writeFileSync(join(자료, 'screens', 'out-002.md'), '# https://s.test/login\n로그인 기록');
    서버(다봄답());
    const 거절 = { 거절: '올릴 화면 기록에 테스트 계정 비밀번호가 들어 있다 — 올리지 않는다' };
    크롤쓰기([홈, { ...로그인화면, 이름: '로그인 — pw-1234' }]);
    expect(await 저장본올리기(통로, 자료, true, 'pw-1234', 지금)).toEqual(거절);
    크롤쓰기([홈, 로그인화면]);
    writeFileSync(join(자료, 'screens', 'out-002.md'), '# https://s.test/login\n비밀번호 칸에 pw-1234 를 넣었다');
    expect(await 저장본올리기(통로, 자료, true, 'pw-1234', 지금)).toEqual(거절);
    expect(건것들).toEqual([]);
  });

  it('크롤 목록이 없으면 건너뛴다 · 링크인 기록은 따라가지 않는다 · 서버가 못 받은 화면은 센다', async () => {
    서버((x) => (x.method === 'GET' ? { status: 200, 몸: { screens: [] } } : { status: 400, 몸: { error: 'BAD_SCREEN' } }));
    expect(await 저장본올리기(통로, 자료, true, null, 지금)).toEqual({ 줄: '화면 기록 저장: 크롤 목록이 없어 건너뜀' });
    크롤쓰기([홈, 로그인화면]);
    const 밖 = join(폴더, '비밀.txt');
    writeFileSync(밖, '# https://s.test/login\n비밀');
    symlinkSync(밖, join(자료, 'screens', 'out-002.md'));
    writeFileSync(join(자료, 'screens', 'out-001.md'), '# https://s.test/\n홈 기록');
    expect(await 저장본올리기(통로, 자료, true, null, 지금)).toEqual({ 줄: '화면 기록 저장: 재사용 0장 · 새로 저장 0장 · 못 올림 1장 · 못 본 화면 지우기 실패' });
    expect(JSON.stringify(건것들)).not.toContain('비밀');
    서버(() => ({ status: 500 }));
    expect(await 저장본올리기(통로, 자료, true, null, 지금)).toEqual({ 줄: '화면 기록 저장: 실패 — 저장본을 못 읽었다(서버 500)' });
  });
});
