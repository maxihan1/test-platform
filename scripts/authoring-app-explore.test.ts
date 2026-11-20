// 앱 탐색 검사 — 목표표 읽기 · 체크포인트(길 있음은 crawl · 맵에, 경로 확보는 이번 줄 · 확인 줄로 길) · 결과 줄 · 탐색 줄 올리기 · 에이전트 체크포인트 · 자식 스스로 검사 (도메인/작성 §3.6 「★ 앱 탐색」)
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type 읽은줄, 앱맵글짓기 } from '../apps/admin/src/prd/appRoute.js';
import { type 앱목표, type 앱목표표, 실행, 앱맵올리기, 앱체크포인트돌기, 앱탐색절, 앱탐색줄, 목표표읽기, 체크포인트, 탐색맵읽기 } from './authoring-app-explore.js';

const 줄 = (x: Partial<읽은줄> & Pick<읽은줄, 'kind' | 'from_key' | 'action'>): 읽은줄 => ({
  to_key: null, helper: null, duration_ms: null, warning: null, fields: null, status: 'OK', reason: null, build_no: null, ...x,
});
const 홈 = 'app:.MainActivity/홈';
const 알림 = 'app:.MainActivity/알림';
const 상세 = 'app:.StatusActivity/글 상세';
const 글쓰기 = 'app:.ComposeActivity/글쓰기';
const 맵 = 앱맵글짓기([줄({ kind: 'MOVE', from_key: 홈, action: '「알림」 탭 누르기', to_key: 알림, build_no: '23' })]);
const 색인 = { links: [{ 상태: '로그인:일반 회원', from: 홈, to: 글쓰기, via: '버튼 「글쓰기」' }], screens: [{ key: 홈, 상태: '로그인:일반 회원', apis: [] }, { key: 글쓰기, 상태: '로그인:일반 회원', apis: [] }] };
const 이번 = { rows: [
  { kind: 'SETUP', fromKey: '다른 계정이 API 로 글 올리기', action: '타임라인에 남의 글 있음', toKey: 상세, status: 'OK', helper: '남의글올리기' },
  { kind: 'MOVE', fromKey: 홈, action: '첫 글 누르기', toKey: 상세, status: 'OK' },
] };
const 목표 = (x: Partial<앱목표>): 앱목표 => ({ 기능: '글 상세', 화면: 상세, 결과: '경로 확보', ...x });

let 자료 = '';
let 부름: ReturnType<typeof vi.fn>;
const 서버 = (답들: Record<string, { status: number; 몸?: unknown }>) => {
  부름 = vi.fn(async (url: string, init?: RequestInit) => {
    const 답 = 답들[`${init?.method ?? 'GET'} ${url.replace('http://admin:3000/api/authoring/requests/7', '')}`] ?? { status: 404, 몸: {} };
    return new Response(답.status === 204 ? null : JSON.stringify(답.몸 ?? {}), { status: 답.status });
  });
  vi.stubGlobal('fetch', 부름);
};
const 통로 = { 주소기지: 'http://admin:3000', 토큰: 't', 번호: 7 };
const 쓰기 = (이름: string, 값: unknown) => writeFileSync(join(자료, 이름), typeof 값 === 'string' ? 값 : JSON.stringify(값));
const 크롤쓰기 = () => {
  mkdirSync(join(자료, 'crawl'), { recursive: true });
  쓰기('crawl/index.json', 색인);
};

beforeEach(() => {
  자료 = mkdtempSync(join(tmpdir(), 'app-explore-'));
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  rmSync(자료, { recursive: true, force: true });
});

describe('목표표읽기', () => {
  it('없거나 JSON 이 아니거나 목표 배열이 없거나 칸이 틀리면 까닭 글이다', () => {
    expect(목표표읽기(null)).toMatch(/app-explore.json 이 없거나/);
    expect(목표표읽기('{')).toMatch(/JSON/);
    expect(목표표읽기('{}')).toMatch(/「목표」 배열/);
    expect(목표표읽기(JSON.stringify({ 목표: [{ 기능: 'x', 결과: null }] }))).toMatch(/목표 1 의 꼴/);
    expect(목표표읽기(JSON.stringify({ 목표: [{ 기능: 'x', 화면: 홈, 결과: '빈 곳' }] }))).toMatch(/목표 1 의 꼴/);
  });

  it('목표와 계정비우기를 읽는다 — 계정비우기가 글이 아니면 빈 글', () => {
    expect(목표표읽기(JSON.stringify({ 목표: [{ 기능: '홈', 화면: 홈, 결과: '길 있음' }], 계정비우기: null }))).toEqual({ 목표: [{ 기능: '홈', 화면: 홈, 결과: '길 있음' }], 계정비우기: '' });
  });
});

describe('체크포인트', () => {
  const 판 = () => {
    쓰기('app-route.txt', 맵);
    크롤쓰기();
    쓰기('app-route.json', 이번);
    const 맵값 = 탐색맵읽기(자료);
    if ('못읽음' in 맵값) throw new Error(맵값.못읽음);
    return 맵값;
  };
  const 표 = (목표들: 앱목표[], 계정비우기 = '함'): 앱목표표 => ({ 목표: 목표들, 계정비우기 });

  it('길 있음은 crawl 목록이나 맵에, 경로 확보는 이번 줄로 닿고 확인 줄로 길이 나면 지난다', () => {
    expect(체크포인트(표([목표({ 기능: '글쓰기', 화면: 글쓰기, 결과: '길 있음' }), 목표({ 기능: '알림', 화면: 알림, 결과: '길 있음' }), 목표({ 출발: 홈 })]), 판())).toEqual([]);
  });

  it('결과 없음 · 까닭 없는 진행 불가 · 어디에도 없는 길 있음 · 이번 줄에 없는 경로 확보 · 계정비우기 없음을 짚는다', () => {
    const 못지남 = 체크포인트(표([
      목표({ 기능: 'a', 결과: null }),
      목표({ 기능: 'b', 결과: '진행 불가' }),
      목표({ 기능: 'c', 화면: 'app:.X/없음', 결과: '길 있음' }),
      목표({ 기능: 'd', 화면: 알림, 출발: 홈 }),
    ], ''), 판());
    expect(못지남).toEqual([
      '「a」 — 결과가 없다(「길 있음」 · 「경로 확보」 · 「진행 불가」와 까닭)',
      '「b」 — 진행 불가 까닭이 없다',
      '「c」 — 「길 있음」인데 app:.X/없음 이 crawl 목록에도 맵에도 없다',
      `「d」 — 「경로 확보」인데 app-route.json 에 ${알림} 에 닿는 이동 · 데이터 세팅 줄이 없다`,
      '「계정비우기」가 없다 — 「함」 또는 「못 함 — <까닭>」',
    ]);
  });

  it('출발이 하나면 알아서 고르고 여럿이면 목표의 「출발」 칸에 적게 한다 · 확인 줄로 길이 안 나면 짚는다', () => {
    const 맵값 = 판();
    expect(체크포인트(표([목표({})]), 맵값)).toEqual([]);
    const 둘 = { ...맵값, 줄들: [...맵값.줄들, { ...맵값.줄들[0]!, from: 'app:.LoginActivity/로그인', action: '로그인 누르기' }] };
    expect(체크포인트(표([목표({})]), 둘)[0]).toMatch(/목표의 「출발」 칸에 적는다/);
    expect(체크포인트(표([목표({ 출발: 알림 })]), 맵값)).toEqual(['「글 상세」 — 경로 검색이 「확인」 줄만으로 길을 다 못 낸다 — 폰에서 통과한 동작을 app-route.json 에 적었나 본다']);
  });

  it('목표가 없으면 못 지난다', () => {
    expect(체크포인트(표([]), 판())).toEqual(['목표가 하나도 없다 — 표준 기획서의 기능 단위마다 목표를 적는다']);
  });
});

describe('앱탐색줄', () => {
  it('셈과 진행 불가 까닭 · 계정 비우기 못 함을 싣고, 비밀번호가 섞였으면 까닭을 안 적는다', () => {
    const 표: 앱목표표 = { 목표: [목표({ 결과: '길 있음' }), 목표({}), 목표({ 기능: '알림 상세', 결과: '진행 불가', 까닭: '두 번째 계정 없음' })], 계정비우기: '못 함 — 지우는 API 를 못 찾음' };
    expect(앱탐색줄(표, [])).toBe('앱 탐색: 목표 3개 — 길 있음 1 · 경로 확보 1 · 진행 불가 1 — 알림 상세(두 번째 계정 없음) / 계정 비우기 못 함(지우는 API 를 못 찾음) — 폰 돌려 보기 초록은 탐색이 남긴 데이터 덕일 수 있다');
    expect(앱탐색줄({ ...표, 계정비우기: '함' }, [])).toBe('앱 탐색: 목표 3개 — 길 있음 1 · 경로 확보 1 · 진행 불가 1 — 알림 상세(두 번째 계정 없음)');
    expect(앱탐색줄({ ...표, 계정비우기: '못 함 — pw1234 로 못 지움' }, ['pw1234'])).toBe('앱 탐색: 목표 3개 — 길 있음 1 · 경로 확보 1 · 진행 불가 1 — 까닭에 테스트 계정 비밀번호가 들어 있어 안 적음');
  });
});

describe('앱맵올리기', () => {
  it('이번 줄을 그대로 PUT 하고, 없으면 아무것도 안 한다 · 400 이면 틀림 · 비밀번호가 섞였으면 안 올린다', async () => {
    서버({ 'PUT /app-route': { status: 204 } });
    expect(await 앱맵올리기(통로, 자료, [])).toEqual({ 줄: null, 틀림: null });
    쓰기('app-route.json', 이번);
    expect(await 앱맵올리기(통로, 자료, [])).toEqual({ 줄: '앱 조작 맵: 탐색 줄 2개 올림', 틀림: null });
    expect(JSON.parse((부름.mock.calls[0]![1] as RequestInit).body as string)).toEqual(이번);
    서버({ 'PUT /app-route': { status: 400, 몸: { detail: 'rows.0.kind' } } });
    expect((await 앱맵올리기(통로, 자료, [])).틀림).toBe('app-route.json 을 서버가 거절했다 — 서버 400 (rows.0.kind)');
    expect((await 앱맵올리기(통로, 자료, ['남의글올리기'])).줄).toBe('앱 조작 맵: 탐색 줄에 테스트 계정 비밀번호가 들어 있어 안 올림');
  });

  it('빌드를 받았으면 빌드 없는 「확인」 줄에만 단다 — 진행 불가 · 빌드를 적은 줄은 그대로고 서버가 거절할 빌드 이름은 안 단다 (APP-F4-09)', async () => {
    서버({ 'PUT /app-route': { status: 204 } });
    const 막힘 = { kind: 'MOVE', fromKey: 상세, action: '「삭제」 누르기', status: 'BLOCKED', reason: '두 번째 계정 없음' };
    const 적은 = { kind: 'MOVE', fromKey: 홈, action: '「설정」 누르기', status: 'OK', buildNo: '30' };
    쓰기('app-route.json', { rows: [...이번.rows, 막힘, 적은] });
    expect(await 앱맵올리기(통로, 자료, [], '31')).toEqual({ 줄: '앱 조작 맵: 탐색 줄 4개 올림 · 확인 줄 2개에 빌드 31', 틀림: null });
    expect(JSON.parse((부름.mock.calls[0]![1] as RequestInit).body as string)).toEqual({ rows: [...이번.rows.map((r) => ({ ...r, buildNo: '31' })), 막힘, 적은] });
    expect(await 앱맵올리기(통로, 자료, [], '빌드 · 31')).toEqual({ 줄: '앱 조작 맵: 탐색 줄 4개 올림', 틀림: null });
  });
});

describe('앱체크포인트돌기', () => {
  it('crawl 줄 · 탐색 줄을 올리고 맵을 다시 받아 지나면 결과 줄을 남긴다', async () => {
    크롤쓰기();
    쓰기('app-route.json', 이번);
    쓰기('app-explore.json', { 목표: [목표({ 출발: 홈 }), 목표({ 기능: '글쓰기', 화면: 글쓰기, 결과: '길 있음' })], 계정비우기: '함' });
    서버({ 'PUT /app-route': { status: 204 }, 'GET /app-route': { status: 200, 몸: { text: 맵 } } });
    const 판 = await 앱체크포인트돌기(통로, 자료, [], '24');
    const 결과 = '앱 탐색: 목표 2개 — 길 있음 1 · 경로 확보 1 · 진행 불가 0';
    expect(판).toEqual({ 줄: 결과, 크롤줄: ['화면 기록 저장: 크롤 목록이 없어 건너뜀', '앱 조작 맵: crawl 이동 1줄 · API 0줄 올림 · 빌드 24'] });
    expect(readFileSync(join(자료, 'app-explore.done'), 'utf8')).toBe(결과);
    expect(readFileSync(join(자료, 'app-route.txt'), 'utf8')).toBe(맵);
    const 올린것 = 부름.mock.calls.filter((c) => (c[1] as RequestInit | undefined)?.method === 'PUT').map((c) => (JSON.parse((c[1] as RequestInit).body as string) as { rows: { kind: string }[] }).rows.length);
    expect(올린것).toEqual([1, 2]);
  });

  it('맵을 다시 못 받으면 앞서 받아 둔 맵 글로 본다', async () => {
    쓰기('app-route.txt', 맵);
    쓰기('app-explore.json', { 목표: [목표({ 기능: '알림', 화면: 알림, 결과: '길 있음' })], 계정비우기: '함' });
    서버({ 'GET /app-route': { status: 502 } });
    expect(await 앱체크포인트돌기(통로, 자료, [], undefined)).toMatchObject({ 줄: '앱 탐색: 목표 1개 — 길 있음 1 · 경로 확보 0 · 진행 불가 0' });
    expect(readFileSync(join(자료, 'app-route.txt'), 'utf8')).toBe(맵);
  });

  it('못 지나면 거절 까닭과 crawl 줄을 돌려주고 지남 표시를 안 남긴다', async () => {
    쓰기('app-explore.json', { 목표: [목표({ 결과: null })], 계정비우기: '함' });
    서버({ 'GET /app-route': { status: 200, 몸: { text: 맵 } } });
    expect(await 앱체크포인트돌기(통로, 자료, [], undefined)).toEqual({ 거절: '앱 탐색 체크포인트를 못 지났다 — 「글 상세」 — 결과가 없다(「길 있음」 · 「경로 확보」 · 「진행 불가」와 까닭)', 크롤줄: [] });
    expect(existsSync(join(자료, 'app-explore.done'))).toBe(false);
  });
});

describe('앱탐색절', () => {
  it('첫 세션은 crawl 명령 · 목표표 · 검사 명령을, 뒤 세션은 결과 줄을 넘긴다 · 둘 다 폰을 놓지 말라고 한다', () => {
    const 첫 = 앱탐색절({ 까지: true }, '/w/d').join('\n');
    expect(첫).toContain('npx tsx scripts/authoring-app-crawl.ts /w/d');
    expect(첫).toContain('npx tsx scripts/authoring-app-explore.ts /w/d');
    expect(첫).toContain('놓지 마라');
    const 뒤 = 앱탐색절({ 끝: '앱 탐색: 목표 1개' }, '/w/d').join('\n');
    expect(뒤).toContain('결과 요약에 이 줄을 그대로 넣어라: 앱 탐색: 목표 1개');
    expect(뒤).toContain('놓지 마라');
    expect(뒤).not.toContain('authoring-app-crawl.ts');
  });
});

describe('실행 — 자식이 탐색 세션을 끝내기 전에 스스로 검사', () => {
  it('목표표가 없으면 1 · 다 맞으면 0 · 인자가 틀리면 2', () => {
    expect(실행([])).toBe(2);
    expect(실행([자료])).toBe(1);
    크롤쓰기();
    쓰기('app-explore.json', { 목표: [목표({ 기능: '글쓰기', 화면: 글쓰기, 결과: '길 있음' })], 계정비우기: '함' });
    expect(실행([자료])).toBe(0);
    쓰기('app-explore.json', { 목표: [목표({ 출발: 홈 })], 계정비우기: '함' });
    expect(실행([자료])).toBe(1);
    쓰기('app-route.json', 이번);
    expect(실행([자료])).toBe(0);
    쓰기('app-route.json', '{"rows":[,]}');
    expect(실행([자료])).toBe(1);
    expect(console.log).toHaveBeenCalledWith('못 지남: app-route.json 을 JSON 으로 못 읽었다');
  });
});
