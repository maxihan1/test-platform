// 화면 기록 저장본 껍데기 검사 — 서버에서 kept/ 로 넣기 · 이번에 본 화면만 올리기 · 화면 연결 · 다 본 상태 · 비밀번호 · 링크를 따라가지 않기 (도메인/작성 §3.6 「★ 역방향」 · PRD-F6-01 · F6-02)
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { 저장본넣기, 저장본올리기, 지도받기, 지도자리, 크롤모두덮음 } from './authoring-screens-keep-io.js';
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

// 본 화면(index.json 의 화면)은 크롤러가 목록을 추리기 전 전부다 — 따로 안 주면 목록 그대로
function 크롤쓰기(목록: object[], 요약: object = { 멈춘까닭: null, 따라가기: true, 상태들: ['로그아웃'], 예외: false }, 본: object[] = 목록) {
  writeFileSync(join(자료, 'crawl', 'list.json'), JSON.stringify(목록));
  writeFileSync(join(자료, 'crawl', 'summary.json'), JSON.stringify(요약));
  writeFileSync(join(자료, 'crawl', 'index.json'), JSON.stringify({ 화면: 본, 걸러짐: [] }));
}
const 홈 = { 주소: 'https://s.test/', 이름: '홈', 상태: '로그아웃', 틀: '/', 지문: 'aaaaaaaaaaaa', 글자지문: 'bbbbbbbbbbbb' };
const 로그인화면 = { 주소: 'https://s.test/login', 이름: '로그인', 상태: '로그아웃', 틀: '/login', 지문: 'cccccccccccc', 글자지문: 'dddddddddddd' };

describe('저장본넣기', () => {
  it('서버 화면 기록을 kept/ 로 넣는다 — 크롤러가 읽는 index.json 과 기록 파일', async () => {
    서버(() => ({ status: 200, 몸: { screens: [{ state: '로그인:일반 회원', url: '/board/:n', name: '글', textFp: 'g', structFp: 'a', record: '# https://s.test/board/3\n글', crawledAt: '2026-10-01T00:00:00.000Z' }], links: [] } }));
    expect(await 저장본넣기(통로, 자료)).toBe(1);
    expect(건것들.map((x) => `${x.method} ${x.url}`)).toEqual(['GET http://admin:3000/api/authoring/requests/7/screens']);
    const 기록 = 저장이름('로그인:일반 회원', '/board/:n');
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
    writeFileSync(
      join(자료, 'crawl', 'links.json'),
      JSON.stringify([
        { 상태: '로그아웃', 틀: '/', 연결: [{ to: '/login', via: '링크 「로그인」' }, { to: '/cart', via: '버튼 「담기」' }, { to: '', via: '버튼 「빈 주소」' }] },
        { 상태: '로그아웃', 틀: '/login', 연결: [{ to: '/', via: '링크 「홈」' }] },
      ]),
    );
    writeFileSync(join(자료, 'screens', 'out-001.md'), '# https://s.test/\n홈 기록');
    writeFileSync(join(자료, 'screens', 'out-002.md'), '# https://s.test/login\n재사용해 복사한 기록');
    // 자식이 kept/ 의 훑은 날을 오늘로 고쳐도 날수는 서버 저장본에서 센다
    mkdirSync(join(자료, 'kept'));
    const 고친것 = { 키: '로그아웃 /login', 상태: '로그아웃', 틀: '/login', 주소: 'https://s.test/login', 지문: 'c', 글자지문: 'd', 기록: 저장이름('로그아웃', '/login'), 훑은날: '2026-10-20' };
    writeFileSync(join(자료, 'kept', 'index.json'), JSON.stringify({ 판: 1, 항목: [고친것] }));
    서버(다봄답([서버기록('로그아웃', '/login', 'https://s.test/login', '2026-10-04T09:00:00.000Z'), 서버기록('로그아웃', '/old', 'https://s.test/old', '2026-09-01T00:00:00.000Z')]));
    const r = await 저장본올리기(통로, 자료, ['pw-1234'], 지금);
    expect(r).toEqual({ 줄: '화면 기록 저장: 재사용 1장(가장 오래된 것 16일) · 새로 저장 1장 · 다 봐서 로그아웃 못 본 화면 1장 지움' });
    expect(건것들).toEqual([
      { url: 'http://admin:3000/api/authoring/requests/7/screens', method: 'GET', body: undefined },
      {
        url: 'http://admin:3000/api/authoring/requests/7/screens',
        method: 'PUT',
        body: { state: '로그아웃', url: '/', name: '홈', textFp: 'bbbbbbbbbbbb', structFp: 'aaaaaaaaaaaa', record: '# https://s.test/\n홈 기록', crawledAt: '2026-10-20T03:00:00.000Z',
          links: [{ toUrl: '/login', via: '링크 「로그인」' }, { toUrl: '/cart', via: '버튼 「담기」' }], apis: [],
        },
      },
      {
        url: 'http://admin:3000/api/authoring/requests/7/screens/done',
        method: 'POST',
        body: { seen: [{ state: '로그아웃', url: '/', name: '홈' }, { state: '로그아웃', url: '/login', name: '로그인' }], complete: ['로그아웃'] },
      },
    ]);
  });

  it('AI 가 안 훑은 화면도 크롤 목록에 있으면 본 것으로 넘긴다 — 대조는 기획서 화면만 훑는다', async () => {
    크롤쓰기([홈, 로그인화면]);
    writeFileSync(join(자료, 'screens', 'out-001.md'), '# https://s.test/\n홈 기록');
    서버(다봄답());
    expect(await 저장본올리기(통로, 자료, [], 지금)).toEqual({ 줄: '화면 기록 저장: 재사용 0장 · 새로 저장 1장 · 다 봐서 로그아웃 못 본 화면 1장 지움' });
    expect(건것들.filter((x) => x.method === 'PUT').map((x) => (x.body as { url: string }).url)).toEqual(['/']);
    expect(건것들.at(-1)?.body).toEqual({ seen: [{ state: '로그아웃', url: '/', name: '홈' }, { state: '로그아웃', url: '/login', name: '로그인' }], complete: ['로그아웃'] });
  });

  it('목록에서 빠진 화면도 크롤러가 본 것이면 본 것으로 넘긴다 — 로그인 상태로도 본 /login 의 로그아웃 기록이 안 지워진다 (PRD-F9-05)', async () => {
    const 로그인쪽 = { ...로그인화면, 상태: '로그인:일반 회원' };
    크롤쓰기([홈, 로그인쪽], { 멈춘까닭: null, 따라가기: true, 상태들: ['로그아웃', '로그인:일반 회원', '로그인'], 예외: false }, [
      홈,
      로그인화면,
      { ...홈, 상태: '로그인:일반 회원', 이름: '홈 (로그인)' },
      로그인쪽,
      { ...홈, 상태: '로그인:일반 회원', 틀: '/my', 이름: '로그인', 로그인풀림: true },
      { ...홈, 상태: '로그인', 틀: '/옛', 이름: '옛 상태' },
    ]);
    서버(다봄답());
    await 저장본올리기(통로, 자료, [], 지금);
    expect(건것들.at(-1)?.body).toEqual({
      seen: [
        { state: '로그아웃', url: '/', name: '홈' },
        { state: '로그아웃', url: '/login', name: '로그인' },
        { state: '로그인:일반 회원', url: '/', name: '홈 (로그인)' },
        { state: '로그인:일반 회원', url: '/login', name: '로그인' },
      ],
      complete: ['로그아웃', '로그인:일반 회원'],
    });
  });

  it('본 화면의 화면 크기 차이를 seen 에 싣고 서버가 다시 가른 판정을 줄에 적는다 — 틀린 차이는 안 싣고 · 차이 속 이름도 비밀번호를 본다 (PRD-F10-07)', async () => {
    const 차이 = { 넘침: false, 선언: true, 구조같음: false, PC만: ['고객센터'], 모바일만: ['메뉴 열기'] };
    크롤쓰기([홈, 로그인화면], undefined, [{ ...홈, 모바일: 차이 }, { ...로그인화면, 모바일: { 넘침: 'yes' } }]);
    서버((x) => (x.method === 'POST' ? { status: 200, 몸: { deleted: 0, viewport: 'responsive' } } : 다봄답()(x)));
    expect(await 저장본올리기(통로, 자료, [], 지금)).toEqual({ 줄: expect.stringContaining(' · 화면 크기 판정 반응형') });
    expect(건것들.at(-1)?.body).toEqual({ seen: [{ state: '로그아웃', url: '/', name: '홈', viewport: 차이 }, { state: '로그아웃', url: '/login', name: '로그인' }], complete: ['로그아웃'] });
    건것들 = [];
    크롤쓰기([홈], undefined, [{ ...홈, 모바일: { ...차이, PC만: ['s3cr3t-pw 님'] } }]);
    expect(await 저장본올리기(통로, 자료, ['s3cr3t-pw'], 지금)).toEqual({ 거절: expect.stringContaining('비밀번호') });
  });

  it('본 화면 목록(index.json)을 못 읽으면 목록만 넘기고 아무것도 안 지운다 (PRD-F9-05)', async () => {
    크롤쓰기([홈]);
    writeFileSync(join(자료, 'crawl', 'index.json'), '깨짐');
    서버(다봄답());
    expect(await 저장본올리기(통로, 자료, [], 지금)).toEqual({ 줄: '화면 기록 저장: 재사용 0장 · 새로 저장 0장 · 본 화면 목록(index.json)을 못 읽어 못 본 화면은 안 지움' });
    expect(건것들.at(-1)?.body).toEqual({ seen: [{ state: '로그아웃', url: '/', name: '홈' }], complete: [] });
  });

  it('찾은 화면 이름(seen)은 500자로 자르고 · 이름이 없으면 빈 글이다 · 이름에 비밀번호가 있으면 하나도 안 올린다', async () => {
    크롤쓰기([{ ...홈, 이름: '가'.repeat(600) }, { ...로그인화면, 이름: undefined }]);
    서버(다봄답());
    await 저장본올리기(통로, 자료, [], 지금);
    expect((건것들.at(-1)?.body as { seen: { name: string }[] }).seen.map((x) => x.name.length)).toEqual([500, 0]);
    건것들 = [];
    크롤쓰기([{ ...홈, 이름: '비번 s3cr3t-pw 화면' }]);
    expect(await 저장본올리기(통로, 자료, ['admin-pw-77', 's3cr3t-pw'], 지금)).toEqual({ 거절: expect.stringContaining('비밀번호') });
    expect(건것들).toEqual([]);
  });

  it('화면 연결 파일이 있는데 못 읽으면(링크) 연결 없이 올리고 줄에 적는다', async () => {
    크롤쓰기([홈], { 멈춘까닭: '로그아웃 몫 시간', 따라가기: true, 상태들: ['로그아웃'] });
    writeFileSync(join(자료, 'screens', 'out-001.md'), '# https://s.test/\n홈 기록');
    const 밖 = join(폴더, 'links.json');
    writeFileSync(밖, JSON.stringify([{ 상태: '로그아웃', 틀: '/', 연결: [{ to: '/x', via: '링크 「x」' }] }]));
    symlinkSync(밖, join(자료, 'crawl', 'links.json'));
    서버(다봄답());
    expect(await 저장본올리기(통로, 자료, [], 지금)).toEqual({ 줄: '화면 기록 저장: 재사용 0장 · 새로 저장 1장 · 화면 연결 파일을 못 읽어 연결 없이 올림' });
    expect(건것들.find((x) => x.method === 'PUT')?.body).toMatchObject({ links: [] });
  });

  it('크롤이 멈춤 · 예외 · 링크를 안 따라갔으면 아무것도 안 지우게 한다', async () => {
    writeFileSync(join(자료, 'screens', 'out-001.md'), '# https://s.test/\n홈 기록');
    서버(다봄답());
    for (const 요약 of [
      { 멈춘까닭: '로그아웃 몫 시간', 따라가기: true, 상태들: ['로그아웃'] },
      { 멈춘까닭: null, 따라가기: true, 상태들: ['로그아웃', '로그인:일반 회원'], 예외: true },
      { 멈춘까닭: null, 따라가기: false, 상태들: ['로그아웃'], 예외: false },
    ]) {
      크롤쓰기([홈], 요약);
      건것들 = [];
      expect(await 저장본올리기(통로, 자료, [], 지금)).toEqual({ 줄: '화면 기록 저장: 재사용 0장 · 새로 저장 1장' });
      expect(건것들.at(-1)?.body).toMatchObject({ complete: [] });
    }
  });

  it('올릴 기록의 본문 · 이름 · 화면 연결에 테스트 계정 비밀번호가 있으면 하나도 안 올리고 거절한다', async () => {
    writeFileSync(join(자료, 'screens', 'out-001.md'), '# https://s.test/\n홈 기록');
    writeFileSync(join(자료, 'screens', 'out-002.md'), '# https://s.test/login\n로그인 기록');
    서버(다봄답());
    const 거절 = { 거절: '올릴 화면 기록에 테스트 계정 비밀번호가 들어 있다 — 올리지 않는다' };
    크롤쓰기([홈, { ...로그인화면, 이름: '로그인 — pw-1234' }]);
    expect(await 저장본올리기(통로, 자료, ['pw-1234'], 지금)).toEqual(거절);
    크롤쓰기([홈, 로그인화면]);
    writeFileSync(join(자료, 'crawl', 'links.json'), JSON.stringify([{ 상태: '로그아웃', 틀: '/', 연결: [{ to: '/x', via: '버튼 「pw-1234」' }] }]));
    expect(await 저장본올리기(통로, 자료, ['pw-1234'], 지금)).toEqual(거절);
    writeFileSync(join(자료, 'crawl', 'links.json'), '[]');
    writeFileSync(join(자료, 'screens', 'out-002.md'), '# https://s.test/login\n비밀번호 칸에 pw-1234 를 넣었다');
    expect(await 저장본올리기(통로, 자료, ['pw-1234'], 지금)).toEqual(거절);
    expect(건것들).toEqual([]);
  });

  it('크롤러가 화면마다 들은 API(apis.json)를 그 화면 PUT 에 싣는다 · 꼴이 틀린 줄은 버린다 · 주소에 비밀번호가 있으면 하나도 안 올린다 (PRD-F10-05)', async () => {
    크롤쓰기([홈]);
    writeFileSync(join(자료, 'screens', 'out-001.md'), '# https://s.test/\n홈 기록');
    writeFileSync(
      join(자료, 'crawl', 'apis.json'),
      JSON.stringify([{ 상태: '로그아웃', 틀: '/', api: [{ method: 'GET', url: 'https://s.test/api/goods' }, { method: 'GET /x', url: 'https://s.test/a' }, { url: 'https://s.test/b' }] }]),
    );
    서버(다봄답());
    await 저장본올리기(통로, 자료, ['pw-1234'], 지금);
    expect(건것들.find((x) => x.method === 'PUT')!.body).toMatchObject({ url: '/', apis: [{ method: 'GET', url: 'https://s.test/api/goods' }] });

    건것들 = [];
    writeFileSync(join(자료, 'crawl', 'apis.json'), JSON.stringify([{ 상태: '로그아웃', 틀: '/', api: [{ method: 'GET', url: 'https://s.test/u/pw-1234' }] }]));
    expect(await 저장본올리기(통로, 자료, ['pw-1234'], 지금)).toEqual({ 거절: '올릴 화면 기록에 테스트 계정 비밀번호가 들어 있다 — 올리지 않는다' });
    expect(건것들).toEqual([]);
  });

  it('크롤 목록이 없으면 건너뛴다 · 링크인 기록은 따라가지 않는다 · 서버가 못 받은 화면은 센다', async () => {
    서버((x) => (x.method === 'GET' ? { status: 200, 몸: { screens: [] } } : { status: 400, 몸: { error: 'BAD_SCREEN' } }));
    expect(await 저장본올리기(통로, 자료, [], 지금)).toEqual({ 줄: '화면 기록 저장: 크롤 목록이 없어 건너뜀' });
    크롤쓰기([홈, 로그인화면]);
    const 밖 = join(폴더, '비밀.txt');
    writeFileSync(밖, '# https://s.test/login\n비밀');
    symlinkSync(밖, join(자료, 'screens', 'out-002.md'));
    writeFileSync(join(자료, 'screens', 'out-001.md'), '# https://s.test/\n홈 기록');
    expect(await 저장본올리기(통로, 자료, [], 지금)).toEqual({ 줄: '화면 기록 저장: 재사용 0장 · 새로 저장 0장 · 못 올림 1장 · 못 본 화면 지우기 실패' });
    expect(JSON.stringify(건것들)).not.toContain('비밀');
    서버(() => ({ status: 500 }));
    expect(await 저장본올리기(통로, 자료, [], 지금)).toEqual({ 줄: '화면 기록 저장: 실패 — 저장본을 못 읽었다(서버 500)' });
  });
});

describe('크롤모두덮음 — 올리기가 「PRD 에 없는 화면 0」을 알아보는 읽기 (PRD-F6-03)', () => {
  it('목록이 전부 덮음이면 장수, 덮지 않은 줄이 있거나 목록이 없으면 null', () => {
    크롤쓰기([{ ...홈, 덮음: true }, { ...로그인화면, 덮음: true }]);
    expect(크롤모두덮음(자료)).toBe(2);
    크롤쓰기([{ ...홈, 덮음: true }, 로그인화면]);
    expect(크롤모두덮음(자료)).toBeNull();
    rmSync(join(자료, 'crawl'), { recursive: true });
    expect(크롤모두덮음(자료)).toBeNull();
  });

  it('list.json 이 링크면 따라가지 않는다 — 자식이 자리 밖 파일을 읽히지 못하게', () => {
    writeFileSync(join(폴더, '밖.json'), JSON.stringify([{ 덮음: true }]));
    symlinkSync(join(폴더, '밖.json'), join(자료, 'crawl', 'list.json'));
    expect(크롤모두덮음(자료)).toBeNull();
  });
});

describe('지도받기 — 자식 앞에 서비스 지도를 api-map.txt 로 (PRD-F10-05)', () => {
  it('API 하나를 한 줄로 거친 케이스 · 화면과 함께 쓴다 · 지도가 비었거나 서버가 실패하면 파일을 안 만든다', async () => {
    서버(() => ({
      status: 200,
      몸: { apis: [{ method: 'GET', host: 's.test', path: '/api/goods/:n', cases: [{ tcId: 'MKT-FN-001', steps: [1] }], screens: [{ env: 'qa', state: '로그아웃', url: '/goods/:n' }] }, { method: 'POST', host: 's.test', path: '/api/cart', cases: [], screens: [] }] },
    }));
    expect(await 지도받기(통로, 자료)).toBe(2);
    expect(건것들.map((x) => x.url)).toEqual(['http://admin:3000/api/authoring/requests/7/apis']);
    expect(readFileSync(지도자리(자료), 'utf8')).toBe('GET s.test/api/goods/:n · 케이스 MKT-FN-001 · 화면 로그아웃 /goods/:n\nPOST s.test/api/cart\n');

    rmSync(지도자리(자료));
    서버(() => ({ status: 200, 몸: { apis: [] } }));
    expect(await 지도받기(통로, 자료)).toBe(0);
    서버(() => ({ status: 500 }));
    expect(await 지도받기(통로, 자료)).toBe(0);
    expect(readdirSync(자료)).not.toContain('api-map.txt');
  });
});
