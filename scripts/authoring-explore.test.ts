// 탐색 플레이 검사 — 목표 파일 읽기 · 체크포인트(결과 · 까닭 · 「경로 확보」는 확인 행만으로 길이 나나) · 결과 줄 · 더한 돌발 팝업 · 맵 올리기 · 두 세션 띄우기 · 자식 스스로 검사 명령 (도메인/게임 §3.10 「탐색 플레이 · 조작 맵」)
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type 읽은행, 맵글짓기 } from '../apps/admin/src/prd/gameRoute.js';
import { type 탐색목표, 맵올리기, 목표들읽기, 세션띄우기, 실행, 체크포인트, 탐색줄, 팝업추가줄 } from './authoring-explore.js';
import { 맵읽기 } from './authoring-game-route.js';
import type { 돌린결과 } from './authoring-spawn.js';
import { 돌발팝업값 } from './authoring-run3-env.js';

const 행 = (x: Partial<읽은행> & Pick<읽은행, 'kind' | 'from_key' | 'action'>): 읽은행 => ({
  to_key: null, helper: null, duration_ms: null, warning: null, fields: null, status: 'OK', reason: null, build_no: null, ...x,
});
const 맵 = 맵글짓기([
  행({ kind: 'SETUP', from_key: 'game:Main', action: '/gm level 10', to_key: 'state:레벨=10', build_no: '15' }),
  행({ kind: 'MOVE', from_key: 'game:Main', action: '대장간 버튼', to_key: 'game:Main/Canvas/Forge' }),
  행({ kind: 'MOVE', from_key: 'game:Main', action: '상점 버튼', to_key: 'game:Main/Canvas/Shop', status: 'RECHECK' }),
  행({ kind: 'POPUP', from_key: 'game:Main/Canvas/Invite', action: '/Canvas/Invite/Decline' }),
]);
const 상점행 = { kind: 'MOVE', fromKey: 'game:Main', action: '상점 버튼', toKey: 'game:Main/Canvas/Shop', status: 'OK', buildNo: '16' };
const 목표 = (x: Partial<탐색목표>): 탐색목표 => ({ 기능: '강화', 열쇠: ['state:레벨=10', 'game:Main/Canvas/Forge'], 결과: '경로 확보', ...x });

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

beforeEach(() => {
  자료 = mkdtempSync(join(tmpdir(), 'explore-'));
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  rmSync(자료, { recursive: true, force: true });
});

describe('목표들읽기', () => {
  it('파일이 없거나 JSON 이 아니거나 목표 배열이 없으면 까닭 글이다', () => {
    expect(목표들읽기(null)).toMatch(/game-explore\.json 이 없다/);
    expect(목표들읽기('{')).toMatch(/JSON 으로 못 읽었다/);
    expect(목표들읽기('{"goals":[]}')).toMatch(/「목표」 배열이 없다/);
  });

  it('목표 하나라도 꼴이 틀리면 몇 번째인지 짚는다 — 빈 열쇠 · 모르는 결과 · 글이 아닌 까닭', () => {
    expect(목표들읽기(JSON.stringify({ 목표: [목표({}), { 기능: '상점', 열쇠: [], 결과: null }] }))).toMatch(/목표 2 의 꼴이 틀렸다/);
    expect(목표들읽기(JSON.stringify({ 목표: [{ ...목표({}), 결과: '통과' }] }))).toMatch(/목표 1 의 꼴이 틀렸다/);
    expect(목표들읽기(JSON.stringify({ 목표: [{ ...목표({ 결과: '진행 불가' }), 까닭: 3 }] }))).toMatch(/목표 1/);
  });

  it('결과를 아직 안 적은 목표(null)와 빠진 결과 칸은 null 로 읽는다', () => {
    expect(목표들읽기(JSON.stringify({ 목표: [{ 기능: '강화', 열쇠: ['game:Main/Canvas/Forge'] }, 목표({ 출발: 'game:Main' })] }))).toEqual([
      { 기능: '강화', 열쇠: ['game:Main/Canvas/Forge'], 결과: null },
      { 기능: '강화', 열쇠: ['state:레벨=10', 'game:Main/Canvas/Forge'], 출발: 'game:Main', 결과: '경로 확보' },
    ]);
  });
});

describe('체크포인트', () => {
  const 행들 = 맵읽기(맵);

  it('「경로 확보」는 확인 행만으로 길이 나야 지난다 — 진행 불가는 까닭만 있으면 지난다', () => {
    expect(체크포인트([목표({}), 목표({ 기능: '레이드', 열쇠: ['zone:Raid'], 결과: '진행 불가', 까닭: '두 번째 계정 없음' })], 행들)).toEqual([]);
  });

  it('결과가 없거나 진행 불가 까닭이 비면 못 지난다', () => {
    expect(체크포인트([목표({ 결과: null }), 목표({ 기능: '레이드', 결과: '진행 불가', 까닭: ' ' })], 행들)).toEqual([
      '「강화」 — 결과가 없다(「경로 확보」 또는 「진행 불가」와 까닭)',
      '「레이드」 — 진행 불가 까닭이 없다',
    ]);
  });

  it('「재확인 필요」 행을 지나야만 닿는 목표를 「경로 확보」라 적으면 못 지난다', () => {
    expect(체크포인트([목표({ 기능: '상점', 열쇠: ['game:Main/Canvas/Shop'] })], 행들)).toEqual([
      '「상점」 — 경로 검색이 「확인」 행만으로 길을 다 못 낸다 — 폰에서 통과한 동작을 game-route.json 에 적었나 본다',
    ]);
  });

  it('열쇠가 틀리거나 맵이 없거나 출발을 못 정하면 그 까닭을 짚는다', () => {
    expect(체크포인트([목표({ 열쇠: ['game:A', 'game:B'] })], 행들)[0]).toMatch(/열쇠가 틀렸다/);
    expect(체크포인트([목표({})], null)[0]).toMatch(/조작 맵이 없어/);
    const 두장면 = 맵읽기(맵글짓기([행({ kind: 'MOVE', from_key: 'game:Main', action: '가기', to_key: 'game:Lobby' })]));
    expect(체크포인트([목표({ 열쇠: ['game:Lobby'] })], 두장면)[0]).toMatch(/여럿이다 — game:Main · game:Lobby — 로그인 직후 화면 열쇠를 목표의 「출발」 칸에 적는다/);
    expect(체크포인트([목표({ 열쇠: ['game:Lobby'], 출발: 'game:Main' })], 두장면)).toEqual([]);
  });
});

describe('탐색줄', () => {
  it('목표 수 · 경로 확보 · 진행 불가와 그 까닭을 한 줄로 — 5개 넘는 까닭은 수만', () => {
    const 불가 = (n: number) => 목표({ 기능: `기능${String(n)}`, 결과: '진행 불가', 까닭: '로그 안 찍힘' });
    expect(탐색줄([목표({}), 불가(1)], [])).toBe('탐색 플레이: 목표 2개 — 경로 확보 1 · 진행 불가 1 — 기능1(로그 안 찍힘)');
    expect(탐색줄([목표({})], [])).toBe('탐색 플레이: 목표 1개 — 경로 확보 1 · 진행 불가 0');
    expect(탐색줄([1, 2, 3, 4, 5, 6, 7].map(불가), [])).toMatch(/기능5\(로그 안 찍힘\) 외 2개$/);
  });

  it('공개 PR 에 실리는 줄이라 까닭에 계정 비밀번호가 섞이면 까닭을 빼고 적는다', () => {
    expect(탐색줄([목표({ 결과: '진행 불가', 까닭: '로그인 Secret#Pass1 실패' })], ['Secret#Pass1'])).toBe(
      '탐색 플레이: 목표 1개 — 경로 확보 0 · 진행 불가 1 — 까닭에 테스트 계정 비밀번호가 들어 있어 안 적음',
    );
  });
});

describe('팝업추가줄', () => {
  it('이번 작성이 적은 「확인」 팝업 가운데 받은 맵에 없던 창만 센다', () => {
    const 새글 = JSON.stringify({
      rows: [
        { kind: 'POPUP', fromKey: 'game:Main/Canvas/Invite', action: '/Canvas/Invite/Decline', status: 'OK' },
        { kind: 'POPUP', fromKey: 'game:Main/Canvas/Event', action: '/Canvas/Event/Close', status: 'OK' },
        { kind: 'POPUP', fromKey: 'game:Main/Canvas/Error', action: '/Canvas/Error/Ok', status: 'BLOCKED', reason: '닫는 버튼 없음' },
      ],
    });
    expect(팝업추가줄(맵, 새글, [])).toBe('돌발 팝업 행 추가 1 — game:Main/Canvas/Event');
    expect(팝업추가줄(맵, null, [])).toBeNull();
    expect(팝업추가줄(맵, '{', [])).toBeNull();
  });
});

describe('맵올리기', () => {
  it('이번 작성이 적은 행을 PUT 하고 줄을 돌려준다 — 파일이 없으면 줄도 없다', async () => {
    expect(await 맵올리기(통로, 자료, [])).toEqual({ 줄: null, 틀림: null });
    서버({ 'PUT /game-route': { status: 204 } });
    쓰기('game-route.json', { rows: [상점행], remove: [{ kind: 'MOVE', fromKey: 'game:Main', action: '옛 버튼' }] });
    expect(await 맵올리기(통로, 자료, [])).toEqual({ 줄: '조작 맵: 행 1개 올림 · 1개 지움', 틀림: null });
    expect(JSON.parse((부름.mock.calls[0] as [string, RequestInit])[1].body as string)).toMatchObject({ rows: [상점행] });
  });

  it('서버가 꼴로 거절하면(400) 체크포인트를 멈출 틀림을, 그 밖의 실패는 줄만 남긴다', async () => {
    쓰기('game-route.json', { rows: [상점행] });
    서버({ 'PUT /game-route': { status: 400, 몸: { error: 'BAD_ROUTE', detail: 'rows.0.action' } } });
    expect(await 맵올리기(통로, 자료, [])).toEqual({ 줄: '조작 맵: 못 올림 — 서버 400 (rows.0.action)', 틀림: 'game-route.json 을 서버가 거절했다 — 서버 400 (rows.0.action)' });
    서버({ 'PUT /game-route': { status: 503 } });
    expect((await 맵올리기(통로, 자료, [])).틀림).toBeNull();
  });

  it('행에 계정 비밀번호가 들면 올리지 않고 틀림으로 짚는다', async () => {
    서버({ 'PUT /game-route': { status: 204 } });
    쓰기('game-route.json', { rows: [{ ...상점행, action: 'Secret#Pass1 넣기' }] });
    expect((await 맵올리기(통로, 자료, ['Secret#Pass1'])).틀림).toMatch(/비밀번호/);
    expect(부름).not.toHaveBeenCalled();
  });
});

const 결과 = (낸것: string, x: Partial<돌린결과> = {}): 돌린결과 => ({ 코드: 0, 낸것, 오류: '', 시간초과: false, 멈춤으로죽음: false, ...x });

describe('세션띄우기', () => {
  const 판 = (한번: ReturnType<typeof vi.fn>, x: { 탐색?: boolean; 멈추라했다?: () => boolean } = {}) => ({
    탐색: x.탐색 ?? true, 통로, 자료, 비밀: [], 이어하기: undefined, 한번, 거두기: vi.fn(async () => true), 멈추라했다: x.멈추라했다 ?? (() => false), 알린다: vi.fn(),
  });
  const 탐색마침 = () => {
    쓰기('game-explore.json', { 목표: [목표({}), 목표({ 기능: '상점', 열쇠: ['game:Main/Canvas/Shop'] })] });
    쓰기('game-route.json', { rows: [상점행] });
  };

  it('게임이 아니면 한 번만 띄운다', async () => {
    const 한번 = vi.fn(async () => ({ 돌린것: 결과('하나'), 크레딧으로: false, 앞낸것: '크레딧' }));
    expect(await 세션띄우기(판(한번, { 탐색: false }))).toMatchObject({ 앞낸것: ['크레딧'] });
    expect(한번.mock.calls).toEqual([[undefined]]);
  });

  it('탐색 세션이 끝나면 맵을 올리고 다시 받아 체크포인트를 본 뒤 새 세션을 「탐색 플레이를 마침」으로 띄운다', async () => {
    탐색마침();
    서버({ 'PUT /game-route': { status: 204 }, 'GET /game-route': { status: 200, 몸: { text: 맵 } } });
    const 한번 = vi.fn()
      .mockResolvedValueOnce({ 돌린것: 결과('탐색'), 크레딧으로: false, 앞낸것: null })
      .mockResolvedValueOnce({ 돌린것: 결과('케이스'), 크레딧으로: false, 앞낸것: null });

    const 끝 = await 세션띄우기(판(한번));

    const 줄 = '탐색 플레이: 목표 2개 — 경로 확보 2 · 진행 불가 0';
    expect(한번.mock.calls).toEqual([[undefined, { 까지: true }], [{ 번호: 7, 이유: 'EXPLORED', 까닭: null }, { 끝: 줄 }]]);
    expect(끝).toMatchObject({ 돌린것: { 낸것: '케이스' }, 앞낸것: ['탐색'] });
    expect(끝.거절).toBeUndefined();
    expect(readFileSync(join(자료, 'game-explore.done'), 'utf8')).toBe(줄);
    expect(readFileSync(join(자료, 'game-route.txt'), 'utf8')).toBe(맵);
  });

  it('체크포인트를 못 지나면 새 세션을 띄우지 않고 거절 까닭을 돌려준다', async () => {
    쓰기('game-explore.json', { 목표: [목표({ 결과: null })] });
    서버({ 'GET /game-route': { status: 200, 몸: { text: 맵 } } });
    const 한번 = vi.fn(async () => ({ 돌린것: 결과('탐색'), 크레딧으로: false, 앞낸것: null }));
    const 끝 = await 세션띄우기(판(한번));
    expect(한번).toHaveBeenCalledTimes(1);
    expect(끝.거절).toBe('탐색 플레이 체크포인트를 못 지났다 — 「강화」 — 결과가 없다(「경로 확보」 또는 「진행 불가」와 까닭)');
    expect(existsSync(join(자료, 'game-explore.done'))).toBe(false);
  });

  it('탐색 세션이 멈추거나 끊기면 체크포인트 없이 그 결과로 끝낸다 — 폴더가 남아 이어하기가 탐색부터 잇는다', async () => {
    const 한번 = vi.fn(async () => ({ 돌린것: 결과('탐색', { 코드: 1 }), 크레딧으로: false, 앞낸것: null }));
    expect((await 세션띄우기(판(한번))).돌린것.코드).toBe(1);
    expect(한번).toHaveBeenCalledTimes(1);
  });

  it('체크포인트 뒤 사람이 멈췄으면 새 세션을 안 띄우고 멈춤으로 끝낸다', async () => {
    탐색마침();
    서버({ 'PUT /game-route': { status: 204 }, 'GET /game-route': { status: 200, 몸: { text: 맵 } } });
    const 한번 = vi.fn(async () => ({ 돌린것: 결과('탐색'), 크레딧으로: false, 앞낸것: null }));
    expect((await 세션띄우기(판(한번, { 멈추라했다: () => true }))).돌린것.멈춤으로죽음).toBe(true);
    expect(한번).toHaveBeenCalledTimes(1);
  });

  it('이미 체크포인트를 지난 폴더(이어받음)면 탐색 세션을 건너뛰고 결과 줄을 넘긴다', async () => {
    쓰기('game-explore.done', '탐색 플레이: 목표 1개 — 경로 확보 1 · 진행 불가 0\n');
    const 한번 = vi.fn(async () => ({ 돌린것: 결과('케이스'), 크레딧으로: false, 앞낸것: null }));
    await 세션띄우기({ ...판(한번), 이어하기: { 번호: 3, 이유: 'LIMIT', 까닭: null } });
    expect(한번.mock.calls).toEqual([[{ 번호: 3, 이유: 'LIMIT', 까닭: null }, { 끝: '탐색 플레이: 목표 1개 — 경로 확보 1 · 진행 불가 0' }]]);
  });
});

describe('실행 — 자식이 첫 세션을 끝내기 전에 스스로 검사', () => {
  it('아직 안 올린 행까지 보고 0 · 목표 파일이 없거나 빈 결과가 있으면 1 · 폴더가 없으면 2', () => {
    expect(실행([])).toBe(2);
    expect(실행([자료])).toBe(1);
    쓰기('game-route.txt', 맵);
    쓰기('game-explore.json', { 목표: [목표({ 기능: '상점', 열쇠: ['game:Main/Canvas/Shop'] })] });
    expect(실행([자료])).toBe(1);
    쓰기('game-route.json', { rows: [상점행] });
    expect(실행([자료])).toBe(0);
  });
});

describe('돌발팝업값 — 작성 돌려 보기의 PLATFORM_GAME_POPUPS', () => {
  it('받은 맵과 이번 작성이 적은 「확인」 팝업을 장면 머리를 떼고 싣는다 — 없으면 빈 값', () => {
    expect(돌발팝업값(undefined)).toBe('');
    expect(돌발팝업값(자료)).toBe('');
    쓰기('game-route.txt', 맵);
    쓰기('game-route.json', { rows: [{ kind: 'POPUP', fromKey: 'game:Main/Canvas/Event', action: '/Canvas/Event/Close', status: 'OK' }] });
    expect(JSON.parse(돌발팝업값(자료))).toEqual([
      { window: '/Canvas/Invite', close: '/Canvas/Invite/Decline' },
      { window: '/Canvas/Event', close: '/Canvas/Event/Close' },
    ]);
  });
});
