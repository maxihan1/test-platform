// 조작 맵 경로 검색 검사 — 서버가 짓는 맵 글을 그대로 읽어 상태 설정 · 이동 차례 · 경고 순서 · 남는 로그 · 돌발 팝업 · 길 없음을 찍는다 (도메인/게임 §3.10 경로 검색)
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, describe, expect, it, vi } from 'vitest';

import { type 읽은행, 맵글짓기 } from '../apps/admin/src/prd/gameRoute.js';
import { 경로, 맵읽기, 실행 } from './authoring-game-route.js';

const 행 = (x: Partial<읽은행> & Pick<읽은행, 'kind' | 'from_key' | 'action'>): 읽은행 => ({
  to_key: null, helper: null, duration_ms: null, warning: null, fields: null, status: 'OK', reason: null, build_no: null, ...x,
});

const 맵 = 맵글짓기([
  행({ kind: 'SETUP', from_key: 'game:Main', action: '/gm char tank', to_key: 'state:직업=탱커' }),
  행({ kind: 'SETUP', from_key: 'game:Main', action: '/gm gold 100', to_key: 'state:골드=100', status: 'RECHECK' }),
  행({ kind: 'SETUP', from_key: 'game:Main', action: '/gm killall', to_key: 'state:몬스터 없음', warning: '경험치를 줘 레벨이 오른다 — 레벨 맞추기보다 먼저', build_no: '15' }),
  행({ kind: 'SETUP', from_key: 'game:Main', action: '/gm level 1', to_key: 'state:레벨=1', build_no: '15' }),
  행({ kind: 'SETUP', from_key: 'game:Main', action: '/gm solo tank', to_key: 'state:직업=탱커,인원=1' }),
  행({ kind: 'SETUP', from_key: 'game:Main', action: '/gm tp Dungeon', to_key: 'zone:Dungeon', duration_ms: 3000 }),
  행({ kind: 'MOVE', from_key: 'game:Main', action: '상점 버튼', to_key: 'game:Main/Canvas/Shop', status: 'RECHECK', build_no: '14' }),
  행({ kind: 'MOVE', from_key: 'game:Main/Canvas/Shop', action: '강화 탭', to_key: 'game:Main/Canvas/Shop/Upgrade' }),
  행({ kind: 'MOVE', from_key: 'zone:Dungeon', action: '동쪽 문 지나기', to_key: 'zone:Dungeon/ImpRoom', helper: '이동' }),
  행({
    kind: 'MOVE', from_key: 'zone:Dungeon/ImpRoom', action: '적 누르기 후 「공격」 누르기', to_key: '처치',
    fields: { fn: '전투.공격()', 진행값: '처치 줄 수 · ⚠ 가짜 경고' },
  }),
  행({ kind: 'MOVE', from_key: 'zone:Raid', action: '레이드 들어가기', status: 'BLOCKED', reason: '두 번째 계정 없음' }),
  행({ kind: 'LOG', from_key: 'game:Main', action: '/gm killall', to_key: '처치 줄', fields: { 칸: ['user', '경험치'] } }),
  행({ kind: 'LOG', from_key: 'zone:Dungeon/ImpRoom', action: '임프 처치', to_key: '처치 줄' }),
  행({ kind: 'LOG', from_key: 'zone:Town', action: '물약 마시기', to_key: '로그 없음' }),
  행({ kind: 'TERM', from_key: '대장장이', action: '대장장이 브론', to_key: 'npc:Blacksmith' }),
  행({ kind: 'POPUP', from_key: 'game:Main/Canvas/Invite', action: '/Canvas/Invite/Decline' }),
  행({ kind: 'POPUP', from_key: 'game:Main/Canvas/Notice', action: '/Canvas/Notice/Close', status: 'RECHECK' }),
]);
const 행들 = 맵읽기(맵);
const 작은맵 = (rows: 읽은행[]) => 맵읽기(맵글짓기(rows));

describe('맵읽기', () => {
  it('서버가 짓는 맵 글의 행을 종류 · 열쇠 · 상태 · 경고로 읽는다', () => {
    expect(행들).toHaveLength(17);
    expect(행들.find((r) => r.action === '/gm killall' && r.kind === 'SETUP')).toMatchObject({
      from: 'game:Main', to: 'state:몬스터 없음', status: 'OK', warning: '경험치를 줘 레벨이 오른다 — 레벨 맞추기보다 먼저',
    });
    expect(행들.find((r) => r.from === 'zone:Raid')).toMatchObject({ kind: 'MOVE', to: null, status: 'BLOCKED' });
    expect(행들.find((r) => r.kind === 'TERM')).toMatchObject({ from: '대장장이', action: '대장장이 브론', to: 'npc:Blacksmith' });
  });

  it('칸 JSON 안의 「 · 」 · 「⚠ 」 는 경고로 읽지 않는다', () => {
    const 공격 = 행들.find((r) => r.from === 'zone:Dungeon/ImpRoom' && r.kind === 'MOVE');
    expect(공격).toMatchObject({ to: '처치', warning: null });
    expect(공격?.line).toContain('칸 {"진행값":"처치 줄 수 · ⚠ 가짜 경고"}');
  });

  it('종류 머리가 없거나 꼴이 틀린 줄은 뺀다', () => {
    expect(맵읽기('- game:Main → 버튼 → game:Main/A · 확인\n## 이동 · 조작 (MOVE) — 2행\n- 화살표 없음 · 확인\n- game:Main → 버튼 · 모르는 상태')).toEqual([]);
  });
});

describe('경로', () => {
  it('상태 설정 → 순간이동 → 이동 차례를 찍고 경고 달린 설정을 먼저 친다', () => {
    const { 줄들, 다찾음 } = 경로(행들, { 상태: ['레벨=1', '직업=탱커', '인원=1', '몬스터 없음'], 자리: 'zone:Dungeon/ImpRoom' }, 'game:Main');
    expect(다찾음).toBe(true);
    expect(줄들[0]).toBe('# 경로 검색 — 목표 state:레벨=1,직업=탱커,인원=1,몬스터 없음 zone:Dungeon/ImpRoom · 출발 game:Main — 「확인」 행으로만 길을 낸다 · 기대값의 근거가 아니다');
    expect(줄들.slice(1)).toEqual([
      '1. [상태 설정] game:Main → /gm killall → state:몬스터 없음 · 확인 · 빌드 15 · ⚠ 경험치를 줘 레벨이 오른다 — 레벨 맞추기보다 먼저',
      '2. [상태 설정] game:Main → /gm level 1 → state:레벨=1 · 확인 · 빌드 15',
      '3. [상태 설정] game:Main → /gm solo tank → state:직업=탱커,인원=1 · 확인',
      '4. [상태 설정] game:Main → /gm tp Dungeon → zone:Dungeon · 확인 · 소요 3000ms',
      '5. [이동 · 조작] zone:Dungeon → 동쪽 문 지나기 → zone:Dungeon/ImpRoom · 확인 · 도우미 이동',
      '그 자리에서 하는 동작: zone:Dungeon/ImpRoom → 적 누르기 후 「공격」 누르기 → 처치 · 확인 · 함수 전투.공격() · 칸 {"진행값":"처치 줄 수 · ⚠ 가짜 경고"}',
      '남는 로그: game:Main → /gm killall → 처치 줄 · 확인 · 칸 {"칸":["user","경험치"]}',
      '남는 로그: zone:Dungeon/ImpRoom → 임프 처치 → 처치 줄 · 확인',
      '돌발 팝업: game:Main/Canvas/Invite → /Canvas/Invite/Decline · 확인',
    ]);
  });

  it('「재확인 필요」 행을 지나야만 닿는 자리는 길 없음이고 그 길에 낀 행을 붙인다', () => {
    const { 줄들, 다찾음 } = 경로(행들, { 상태: [], 자리: 'game:Main/Canvas/Shop/Upgrade' }, 'game:Main');
    expect(다찾음).toBe(false);
    expect(줄들.slice(1, 3)).toEqual([
      '길 없음: game:Main/Canvas/Shop/Upgrade (목표 자리) — 폰에서 해 볼 목표다',
      '  재확인 필요: game:Main → 상점 버튼 → game:Main/Canvas/Shop · 재확인 필요 · 빌드 14',
    ]);
    expect(줄들.some((l) => l.startsWith('그 자리에서 하는 동작'))).toBe(false);
  });

  it('진행 불가 목표 행은 까닭과 같이 붙인다', () => {
    const { 줄들, 다찾음 } = 경로(행들, { 상태: [], 자리: 'zone:Raid' }, 'game:Main');
    expect(다찾음).toBe(false);
    expect(줄들.slice(1, 3)).toEqual(['길 없음: zone:Raid (목표 자리) — 폰에서 해 볼 목표다', '  진행 불가: zone:Raid → 레이드 들어가기 · 진행 불가 — 두 번째 계정 없음']);
  });

  it('상태를 만드는 확인 행이 없으면 그 조각만 길 없음이고 나머지 차례는 찍는다', () => {
    const { 줄들, 다찾음 } = 경로(행들, { 상태: ['골드=100', '레벨=1'], 자리: null }, 'game:Main');
    expect(다찾음).toBe(false);
    expect(줄들.slice(1, 4)).toEqual([
      '길 없음: state:골드=100 (그 상태를 만드는 상태 설정 행이 없다) — 폰에서 해 볼 목표다',
      '  재확인 필요: game:Main → /gm gold 100 → state:골드=100 · 재확인 필요',
      '1. [상태 설정] game:Main → /gm level 1 → state:레벨=1 · 확인 · 빌드 15',
    ]);
  });

  it('목표 자리의 동작이 확인이 아니면 길이 나도 다시 해 볼 목표로 남긴다', () => {
    const 맵 = 작은맵([
      행({ kind: 'MOVE', from_key: 'game:Main', action: '던전 문', to_key: 'zone:Dungeon' }),
      행({ kind: 'MOVE', from_key: 'zone:Dungeon', action: '적 누르기 후 「공격」 누르기', to_key: '처치', status: 'RECHECK', build_no: '16' }),
      행({ kind: 'MOVE', from_key: 'zone:Dungeon', action: '줍기', to_key: '아이템' }),
    ]);
    const { 줄들, 다찾음 } = 경로(맵, { 상태: [], 자리: 'zone:Dungeon' }, 'game:Main');
    expect(다찾음).toBe(false);
    expect(줄들.slice(1)).toEqual([
      '1. [이동 · 조작] game:Main → 던전 문 → zone:Dungeon · 확인',
      '확인 안 된 동작: zone:Dungeon → 적 누르기 후 「공격」 누르기 → 처치 · 재확인 필요 · 빌드 16',
      '그 자리에서 하는 동작: zone:Dungeon → 줍기 → 아이템 · 확인',
    ]);
  });

  it('상태 설정을 치는 자리가 지금 자리가 아니면 먼저 그리로 간다', () => {
    const 맵 = 작은맵([
      행({ kind: 'SETUP', from_key: 'game:Main', action: '/gm tp Dungeon', to_key: 'zone:Dungeon' }),
      행({ kind: 'SETUP', from_key: 'zone:Dungeon', action: '/gm spawn imp 3', to_key: 'state:임프=3' }),
    ]);
    expect(경로(맵, { 상태: ['임프=3'], 자리: null }, 'game:Main').줄들.slice(1)).toEqual([
      '1. [상태 설정] game:Main → /gm tp Dungeon → zone:Dungeon · 확인',
      '2. [상태 설정] zone:Dungeon → /gm spawn imp 3 → state:임프=3 · 확인',
    ]);
  });

  it('출발을 주면 거기서 간다', () => {
    expect(경로(행들, { 상태: [], 자리: 'zone:Dungeon/ImpRoom' }, 'zone:Dungeon').줄들[1]).toBe(
      '1. [이동 · 조작] zone:Dungeon → 동쪽 문 지나기 → zone:Dungeon/ImpRoom · 확인 · 도우미 이동',
    );
  });

  it('목표 값을 덮어쓰는 조각을 같이 바꾸는 설정은 먼저 쳐서 목표 값이 남게 한다', () => {
    const 맵 = 작은맵([
      행({ kind: 'SETUP', from_key: 'game:Main', action: '/gm party 2', to_key: 'state:인원=2' }),
      행({ kind: 'SETUP', from_key: 'game:Main', action: '/gm solo tank', to_key: 'state:직업=탱커,인원=1' }),
    ]);
    const { 줄들, 다찾음 } = 경로(맵, { 상태: ['인원=2', '직업=탱커'], 자리: null }, 'game:Main');
    expect(다찾음).toBe(true);
    expect(줄들.slice(1)).toEqual([
      '1. [상태 설정] game:Main → /gm solo tank → state:직업=탱커,인원=1 · 확인',
      '2. [상태 설정] game:Main → /gm party 2 → state:인원=2 · 확인',
    ]);
  });

  it('서로 덮어써 순서로 못 푸는 설정은 길 없음이다', () => {
    const 맵 = 작은맵([
      행({ kind: 'SETUP', from_key: 'game:Main', action: '/gm heal party', to_key: 'state:인원=2,직업=힐러' }),
      행({ kind: 'SETUP', from_key: 'game:Main', action: '/gm solo tank', to_key: 'state:직업=탱커,인원=1' }),
    ]);
    const { 줄들, 다찾음 } = 경로(맵, { 상태: ['직업=탱커', '인원=2'], 자리: null }, 'game:Main');
    expect(다찾음).toBe(false);
    expect(줄들).toContain('길 없음: state:직업=탱커 (뒤에 치는 「/gm heal party」 이 직업=힐러 으로 덮어쓴다) — 폰에서 해 볼 목표다');
  });

  it('맞추는 조각 수가 같으면 목표 밖 상태를 덜 건드리는 설정을 고른다', () => {
    const 맵 = 작은맵([
      행({ kind: 'SETUP', from_key: 'game:Main', action: '/gm a-solo tank', to_key: 'state:직업=탱커,인원=1' }),
      행({ kind: 'SETUP', from_key: 'game:Main', action: '/gm char tank', to_key: 'state:직업=탱커' }),
    ]);
    expect(경로(맵, { 상태: ['직업=탱커'], 자리: null }, 'game:Main').줄들.slice(1)).toEqual(['1. [상태 설정] game:Main → /gm char tank → state:직업=탱커 · 확인']);
  });
});

describe('실행', () => {
  const 폴더 = mkdtempSync(join(tmpdir(), 'game-route-'));
  writeFileSync(join(폴더, 'game-route.txt'), 맵);
  const 빈폴더 = mkdtempSync(join(tmpdir(), 'game-route-none-'));
  const 두장면 = mkdtempSync(join(tmpdir(), 'game-route-scenes-'));
  writeFileSync(
    join(두장면, 'game-route.txt'),
    맵글짓기([
      행({ kind: 'MOVE', from_key: 'game:Main', action: '게임 시작', to_key: 'game:Battle' }),
      행({ kind: 'MOVE', from_key: 'game:Battle', action: '메뉴', to_key: 'game:Battle/Canvas/Menu' }),
    ]),
  );
  afterAll(() => {
    for (const x of [폴더, 빈폴더, 두장면]) rmSync(x, { recursive: true, force: true });
  });

  it('장면 첫 화면이 여럿이면 장면 이동 걸음을 빼먹지 않게 --from 을 받는다', () => {
    const 찍음 = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const 오류 = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      expect(실행([두장면, 'game:Battle/Canvas/Menu'])).toBe(2);
      expect(오류.mock.calls.at(-1)?.[0]).toBe('[경로 검색] 장면 첫 화면(game:<장면>)이 여럿이다 — game:Main · game:Battle — 로그인 직후 화면 열쇠를 --from 으로 준다');
      expect(실행([두장면, 'game:Battle/Canvas/Menu', '--from', 'game:Main'])).toBe(0);
      expect(찍음.mock.calls.at(-1)?.[0]).toContain('1. [이동 · 조작] game:Main → 게임 시작 → game:Battle');
      writeFileSync(join(빈폴더, 'game-route.txt'), 맵글짓기([행({ kind: 'MOVE', from_key: 'zone:A', action: '걷기', to_key: 'zone:B' })]));
      expect(실행([빈폴더, 'zone:B'])).toBe(2);
      expect(오류.mock.calls.at(-1)?.[0]).toContain('장면 첫 화면(game:<장면>)이 맵에 없다');
      rmSync(join(빈폴더, 'game-route.txt'));
    } finally {
      찍음.mockRestore();
      오류.mockRestore();
    }
  });

  it('길을 다 찾으면 0, 길 없는 목표가 있으면 1, 부를 수 없으면 2', () => {
    const 찍음 = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const 오류 = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      expect(실행([폴더, 'state:레벨=1', 'zone:Dungeon'])).toBe(0);
      expect(찍음.mock.calls.at(-1)?.[0]).toContain('2. [상태 설정] game:Main → /gm tp Dungeon → zone:Dungeon');
      expect(실행([폴더, 'zone:Dungeon/ImpRoom', '--from', 'zone:Dungeon'])).toBe(0);
      expect(실행([폴더, 'zone:Raid'])).toBe(1);
      expect(실행([폴더])).toBe(2);
      expect(실행([폴더, 'zone:Dungeon', 'zone:Raid'])).toBe(2);
      expect(실행([폴더, 'zone:Dungeon', '--from'])).toBe(2);
      expect(실행([폴더, 'state:'])).toBe(2);
      expect(실행([폴더, 'state:레벨=1', 'state:레벨=2'])).toBe(2);
      expect(실행([빈폴더, 'zone:Dungeon'])).toBe(2);
      expect(오류.mock.calls.at(-1)?.[0]).toContain('game-route.txt 이 없다');
    } finally {
      찍음.mockRestore();
      오류.mockRestore();
    }
  });
});
