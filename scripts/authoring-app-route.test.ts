// 앱 조작 맵 경로 검색 검사 — 서버가 짓는 맵 글을 그대로 읽어 데이터 세팅 · 이동 차례 · 돌발 팝업 · 길 없음을 찍는다 (도메인/작성 §3.6 「★ 앱 탐색」)
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, describe, expect, it, vi } from 'vitest';

import { type 읽은줄, 앱맵글짓기 } from '../apps/admin/src/prd/appRoute.js';
import { 경로, 맵읽기, 새줄더하기, 실행, 출발고르기 } from './authoring-app-route.js';

const 줄 = (x: Partial<읽은줄> & Pick<읽은줄, 'kind' | 'from_key' | 'action'>): 읽은줄 => ({
  to_key: null, helper: null, duration_ms: null, warning: null, fields: null, status: 'OK', reason: null, build_no: null, ...x,
});

const 홈 = 'app:.MainActivity/홈';
const 알림 = 'app:.MainActivity/알림';
const 상세 = 'app:.StatusActivity/글 상세';
const 프로필 = 'app:.ProfileActivity/프로필';

const 맵 = 앱맵글짓기([
  줄({ kind: 'MOVE', from_key: 홈, action: '「알림」 탭 누르기', to_key: 알림, build_no: '23', duration_ms: 400 }),
  줄({ kind: 'MOVE', from_key: 알림, action: '「홈」 탭 누르기', to_key: 홈 }),
  줄({ kind: 'MOVE', from_key: 홈, action: '첫 글 누르기', to_key: 상세, fields: { fn: '홈.첫글()', 메모: '목록 · ⚠ 가짜 경고' } }),
  줄({ kind: 'MOVE', from_key: 상세, action: '글쓴이 누르기', to_key: 프로필, status: 'RECHECK' }),
  줄({ kind: 'MOVE', from_key: 'app:.ListsActivity/목록', action: '목록 열기', status: 'BLOCKED', reason: '두 번째 계정 없음' }),
  줄({
    kind: 'SETUP', from_key: '다른 계정이 API 로 글 올리기', action: '타임라인에 남의 글 있음', to_key: 상세,
    helper: '남의글올리기', warning: '그 계정을 먼저 팔로우해야 보인다',
  }),
  줄({ kind: 'SETUP', from_key: '다른 계정이 내게 답글', action: '알림 있음', to_key: 알림, helper: '답글받기' }),
  줄({ kind: 'SETUP', from_key: '계정 비우기', action: '시드 상태', helper: '비우기' }),
  줄({ kind: 'SETUP', from_key: '다른 계정이 팔로우', action: '팔로워 있음', to_key: 프로필, status: 'RECHECK' }),
  줄({ kind: 'API', from_key: 알림, action: 'GET /api/v1/notifications' }),
  줄({ kind: 'TERM', from_key: '툿', action: '게시', to_key: 'app:.ComposeActivity/글쓰기' }),
  줄({ kind: 'POPUP', from_key: '평점 요청 창', action: '「나중에」 누르기' }),
  줄({ kind: 'POPUP', from_key: '업데이트 안내', action: '「닫기」 누르기', status: 'RECHECK' }),
]);
const 줄들 = 맵읽기(맵);

describe('맵읽기', () => {
  it('서버가 짓는 맵 글의 줄을 종류 · 열쇠 · 상태로 읽는다', () => {
    expect(줄들).toHaveLength(13);
    expect(줄들.find((r) => r.from === '다른 계정이 API 로 글 올리기')).toMatchObject({ kind: 'SETUP', to: 상세, status: 'OK' });
    expect(줄들.find((r) => r.from === 'app:.ListsActivity/목록')).toMatchObject({ kind: 'MOVE', to: null, status: 'BLOCKED' });
    expect(줄들.find((r) => r.action === '「닫기」 누르기')?.status).toBe('RECHECK');
  });

  it('종류 머리가 없거나 꼴이 틀린 줄은 뺀다 — 게임 맵 머리(「행」)도 안 읽는다', () => {
    expect(맵읽기(`- ${홈} → 누르기 → ${알림} · 확인\n## 이동 (MOVE) — 2줄\n- 화살표 없음 · 확인\n- ${홈} → 누르기 · 모르는 상태`)).toEqual([]);
    expect(맵읽기(`## 이동 · 조작 (MOVE) — 1행\n- ${홈} → 누르기 → ${알림} · 확인`)).toEqual([]);
  });
});

describe('경로', () => {
  it('지나는 화면에 걸린 데이터 세팅 → 이동 차례 · 확인된 돌발 팝업만 찍는다 — 줄은 맵 글 그대로', () => {
    const { 줄들: 찍음, 다찾음 } = 경로(줄들, 상세, 홈);
    expect(다찾음).toBe(true);
    expect(찍음).toEqual([
      `# 경로 검색 — 목표 ${상세} · 출발 ${홈} — 「확인」 줄로만 길을 낸다 · 기대값의 근거가 아니다`,
      `1. [데이터 세팅] 다른 계정이 API 로 글 올리기 → 타임라인에 남의 글 있음 → ${상세} · 확인 · 도우미 남의글올리기 · ⚠ 그 계정을 먼저 팔로우해야 보인다`,
      `2. [이동] ${홈} → 첫 글 누르기 → ${상세} · 확인 · 함수 홈.첫글() · 칸 {"메모":"목록 · ⚠ 가짜 경고"}`,
      '돌발 팝업: 평점 요청 창 → 「나중에」 누르기 · 확인',
    ]);
  });

  it('출발 화면의 세팅도 찍고 화면이 없는 세팅(계정 비우기)은 안 찍는다', () => {
    const 찍음 = 경로(줄들, 홈, 알림).줄들;
    expect(찍음.filter((x) => x.includes('[데이터 세팅]'))).toEqual([`1. [데이터 세팅] 다른 계정이 내게 답글 → 알림 있음 → ${알림} · 확인 · 도우미 답글받기`]);
    expect(찍음.some((x) => x.includes('계정 비우기'))).toBe(false);
  });

  it('「다시 확인」 이동으로만 닿는 목표는 길 없음 — 그 길에 낀 줄과 목표 화면의 확인 안 된 세팅을 붙인다', () => {
    const { 줄들: 찍음, 다찾음 } = 경로(줄들, 프로필, 홈);
    expect(다찾음).toBe(false);
    expect(찍음).toContain(`확인 안 된 데이터 세팅: 다른 계정이 팔로우 → 팔로워 있음 → ${프로필} · 다시 확인`);
    expect(찍음).toContain(`길 없음: ${프로필} — 폰에서 해 볼 목표다`);
    expect(찍음).toContain(`  다시 확인: ${상세} → 글쓴이 누르기 → ${프로필} · 다시 확인`);
    expect(찍음.some((x) => x.includes('[이동]'))).toBe(false);
  });

  it('진행 불가 목표 줄을 붙인다', () => {
    const { 줄들: 찍음, 다찾음 } = 경로(줄들, 'app:.ListsActivity/목록', 홈);
    expect(다찾음).toBe(false);
    expect(찍음).toContain('  진행 불가: app:.ListsActivity/목록 → 목록 열기 · 진행 불가 — 두 번째 계정 없음');
  });

  it('출발이 목표면 이동 없이 그 화면의 세팅만', () => {
    expect(경로(줄들, 알림, 알림)).toMatchObject({ 다찾음: true, 줄들: expect.arrayContaining([expect.stringContaining('1. [데이터 세팅] 다른 계정이 내게 답글')]) });
  });
});

describe('출발고르기', () => {
  it('준 것이 있으면 그것, 없으면 들어오는 확인 이동이 없는 화면이 하나일 때만', () => {
    expect(출발고르기(줄들, 알림)).toEqual({ 출발: 알림 });
    // 홈 ↔ 알림이 서로 들어와 들어오는 이동이 없는 화면이 없다
    expect(출발고르기(줄들)).toMatchObject({ 까닭: expect.stringContaining('맵에 없다') });
    const 한줄 = 맵읽기(앱맵글짓기([줄({ kind: 'MOVE', from_key: 홈, action: '누르기', to_key: 알림 })]));
    expect(출발고르기(한줄)).toEqual({ 출발: 홈 });
    const 둘 = 맵읽기(앱맵글짓기([줄({ kind: 'MOVE', from_key: 홈, action: '누르기', to_key: 알림 }), 줄({ kind: 'MOVE', from_key: 상세, action: '누르기', to_key: 알림 })]));
    expect(출발고르기(둘)).toMatchObject({ 까닭: expect.stringContaining(`여럿이다 — ${홈} · ${상세}`) });
  });
});

describe('실행', () => {
  const 폴더 = mkdtempSync(join(tmpdir(), 'app-route-'));
  const 빈폴더 = mkdtempSync(join(tmpdir(), 'app-route-empty-'));
  writeFileSync(join(폴더, 'app-route.txt'), 맵);
  afterAll(() => {
    rmSync(폴더, { recursive: true, force: true });
    rmSync(빈폴더, { recursive: true, force: true });
  });

  it('길을 다 찾으면 0, 길이 없으면 1, 부를 수 없으면 2', () => {
    const 찍음 = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const 오류 = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      expect(실행([폴더, 상세, '--from', 홈])).toBe(0);
      expect(찍음.mock.calls.at(-1)?.[0]).toContain(`2. [이동] ${홈} → 첫 글 누르기 → ${상세}`);
      expect(실행([폴더, 프로필, '--from', 홈])).toBe(1);
      expect(실행([폴더, 상세])).toBe(2);
      expect(오류.mock.calls.at(-1)?.[0]).toContain('--from 으로 준다');
      expect(실행([폴더])).toBe(2);
      expect(실행([폴더, 상세, 알림, '--from', 홈])).toBe(2);
      expect(실행([폴더, 상세, '--from'])).toBe(2);
      expect(실행([빈폴더, 상세, '--from', 홈])).toBe(2);
      expect(오류.mock.calls.at(-1)?.[0]).toContain('app-route.txt 이 없다');
    } finally {
      찍음.mockRestore();
      오류.mockRestore();
    }
  });
});

describe('새줄더하기 — 이번 작성이 적은 줄(app-route.json)을 맵에 얹는다', () => {
  it('같은 줄은 새 줄이 이기고 remove 는 빼고 꼴이 틀린 줄은 건너뛴다 — 새 줄은 서버 맵 글과 같은 꼴이다', () => {
    const 얹은 = 새줄더하기(줄들, {
      rows: [
        { kind: 'MOVE', fromKey: 상세, action: '글쓴이 누르기', toKey: 프로필, status: 'OK', buildNo: '24', durationMs: 800, fields: { fn: '상세.글쓴이()', 메모: '없음' } },
        { kind: 'NOPE', fromKey: 홈, action: 'x', status: 'OK' },
        { kind: 'MOVE', fromKey: 홈, action: 'y', status: 'RECHECK' },
      ],
      remove: [{ kind: 'TERM', fromKey: '툿', action: '게시' }],
    });
    expect(얹은).toHaveLength(줄들.length - 1);
    expect(얹은.find((r) => r.action === '글쓴이 누르기')).toEqual({
      kind: 'MOVE', from: 상세, action: '글쓴이 누르기', to: 프로필, status: 'OK',
      line: `${상세} → 글쓴이 누르기 → ${프로필} · 확인 · 빌드 24 · 소요 800ms · 함수 상세.글쓴이() · 칸 {"메모":"없음"}`,
    });
    expect(얹은.some((r) => r.kind === 'TERM')).toBe(false);
    expect(새줄더하기(줄들, null)).toEqual(줄들);
  });

  it('빌드를 안 실은 확인 줄은 「다시 확인」 줄을 풀지 않는다 — 빌드를 실으면 푼다', () => {
    const 글쓴이 = (x: Record<string, unknown>) => 새줄더하기(줄들, { rows: [{ kind: 'MOVE', fromKey: 상세, action: '글쓴이 누르기', toKey: 프로필, status: 'OK', ...x }] }).find((r) => r.action === '글쓴이 누르기');
    expect(글쓴이({})).toMatchObject({ status: 'RECHECK', line: `${상세} → 글쓴이 누르기 → ${프로필} · 다시 확인` });
    expect(글쓴이({ buildNo: '24' })?.status).toBe('OK');
  });

  it('경로 검색 명령이 자료 폴더의 새 줄로 길을 낸다 — JSON 이 깨졌으면 알리고 받은 맵만 쓴다', () => {
    const 폴더 = mkdtempSync(join(tmpdir(), 'app-route-new-'));
    const 찍음 = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const 오류 = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const 세팅 = { kind: 'SETUP', fromKey: '다른 계정이 팔로우', action: '팔로워 있음', toKey: 프로필, status: 'OK', buildNo: '24' };
    try {
      writeFileSync(join(폴더, 'app-route.txt'), 맵);
      expect(실행([폴더, 프로필, '--from', 홈])).toBe(1);
      writeFileSync(join(폴더, 'app-route.json'), JSON.stringify({ rows: [세팅, { kind: 'MOVE', fromKey: 상세, action: '글쓴이 누르기', toKey: 프로필, status: 'OK', buildNo: '24' }] }));
      expect(실행([폴더, 프로필, '--from', 홈])).toBe(0);
      expect(찍음.mock.calls.at(-1)?.[0]).toContain(`4. [이동] ${상세} → 글쓴이 누르기 → ${프로필} · 확인 · 빌드 24`);
      writeFileSync(join(폴더, 'app-route.json'), '{');
      expect(실행([폴더, 프로필, '--from', 홈])).toBe(1);
      expect(오류.mock.calls.some(([x]) => String(x).includes('app-route.json 을 JSON 으로 못 읽었다'))).toBe(true);
      rmSync(join(폴더, 'app-route.txt'));
      writeFileSync(join(폴더, 'app-route.json'), JSON.stringify({ rows: [{ kind: 'MOVE', fromKey: 홈, action: '가기', toKey: 알림, status: 'OK' }] }));
      expect(실행([폴더, 알림])).toBe(0);
    } finally {
      찍음.mockRestore();
      오류.mockRestore();
      rmSync(폴더, { recursive: true, force: true });
    }
  });
});
