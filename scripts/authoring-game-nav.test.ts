// 게임 맵 훑기 — 번져 묻기 · 못 심는 곳 모양(상자 돌림 · 구 · 테두리) · 가짜 게임에 묻고 되돌리기 · 훑기가 있는 격자 · 자리후보 빼기
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { 입력읽기 } from '@platform/kit/gameplay';
import { afterAll, describe, expect, it } from 'vitest';

import { 막음안, 훑기파일, type 맵훑기 } from './authoring-game-nav-file.js';
import { 게임훑기, 모양읽기, 번져채우기 } from './authoring-game-nav.js';
import { 걸음됨, 격자짓기, 곧게펴기, 길내기, 막힘, 모름, type 격자 } from './authoring-game-path.js';
import { 순서자료 } from './authoring-game-calc.js';
import { 못심는곳빼기 } from './authoring-game-sim-run.js';

// 걸을 수 있는 곳 — x 0~5 · z 0~3 방에서 x 2 칸은 z 0~1 이 벽이다(z 2 로 돌아간다)
const 열림인가 = (i: number, j: number): boolean => i >= 0 && i < 5 && j >= 0 && j < 3 && !(i === 2 && j < 2);
const 칸값 = (g: 격자, i: number, j: number): number => g.칸[(j - g.최소j) * g.너비 + (i - g.최소i)]!;

describe('번져 묻기', () => {
  it('시작 칸에서 열린 칸만 번지고 막힌 칸은 가장자리로 남는다 · 상한에 닿으면 끊김', async () => {
    const r = await 번져채우기([0, 0], async (i, j) => 열림인가(i, j), 1000);
    expect(r.끊김).toBe(false);
    expect(r.열림).toHaveLength(13);
    expect(r.막힘).toContainEqual([2, 0]);
    expect(r.막힘).toContainEqual([-1, 0]);
    expect(r.막힘).not.toContainEqual([9, 9]);
    const 끊 = await 번져채우기([0, 0], async (i, j) => 열림인가(i, j), 5);
    expect(끊.끊김).toBe(true);
    expect(끊.열림.length + 끊.막힘.length).toBe(5);
  });
});

describe('못 심는 곳 모양', () => {
  it('상자는 y 축 각도만큼 돌려 보고, 원은 반지름 안이다', () => {
    const 세운 = { 중심: [10, 10] as const, 반: [1, 4] as const, 각: 0 };
    expect(막음안(세운, [10, 13])).toBe(true);
    expect(막음안(세운, [13, 10])).toBe(false);
    const 눕힌 = { ...세운, 각: 90 };
    expect(막음안(눕힌, [13, 10])).toBe(true);
    expect(막음안(눕힌, [10, 13])).toBe(false);
    expect(막음안({ 중심: [0, 0], 반지름: 2 }, [1, 1])).toBe(true);
    expect(막음안({ 중심: [0, 0], 반지름: 2 }, [2, 2])).toBe(false);
  });

  it('상자 충돌체는 자리 · 돌림 · 크기를 반영하고, 없으면 구 충돌체, 그것도 없으면 충돌체 테두리 상자다', async () => {
    const 값들 = (v: Record<string, unknown>) => async (prop: string): Promise<unknown> => v[prop];
    const 상자 = await 모양읽기(값들({ 'Transform.position': [10, 0, 10], 'Transform.eulerAngles': [0, 90, 0], 'Transform.lossyScale': [2, 1, 2], 'BoxCollider.center': [1, 0, 0], 'BoxCollider.size': [3, 1, 1] }));
    expect(상자).toMatchObject({ 반: [3, 1], 각: 90 });
    // 돌림 90° 에서 앞쪽 x 1(크기 2배라 2)은 월드에서 z −2 쪽이다
    expect((상자 as unknown as { 중심: number[] }).중심[0]).toBeCloseTo(10);
    expect((상자 as unknown as { 중심: number[] }).중심[1]).toBeCloseTo(8);
    expect(await 모양읽기(값들({ 'Transform.position': [5, 0, 5], 'Transform.eulerAngles': [0, 0, 0], 'Transform.lossyScale': [2, 2, 2], 'SphereCollider.center': [0, 0, 0], 'SphereCollider.radius': 1.5 }))).toEqual({ 중심: [5, 5], 반지름: 3 });
    expect(await 모양읽기(값들({ 'Collider.bounds.center': [4, 0, 6], 'Collider.bounds.size': [2, 1, 8] }))).toEqual({ 중심: [4, 6], 반: [1, 4], 각: 0 });
    expect(await 모양읽기(값들({}))).toBeNull();
  });
});

describe('게임에 묻기', () => {
  // 가짜 게임 — 걸을 수 없는 목적지는 가장 가까운 걸을 곳으로 옮기고, 멈춤 값을 기억한다
  const 가짜게임 = (덧: { 자리?: number[]; 멈춤됨?: boolean; 늦음?: boolean; 풀기?: number } = {}) => {
    const 부름: string[] = [];
    let 멈춤 = false;
    const game = {
      call: async (c: Record<string, unknown>) => {
        부름.push(`${String(c.cmd)} ${String(c.prop ?? c.method ?? '')}`);
        if (c.cmd === 'set' && c.prop === 'NavMeshAgent.destination') {
          // 풀기 번째 목적지에서 게임이 멈춤을 푼다
          if (부름.filter((x) => x.endsWith('destination')).length === 덧.풀기) 멈춤 = false;
          const [x, y, z] = JSON.parse(String(c.value)) as number[];
          return { ok: true, value: 열림인가(Math.floor(x!), Math.floor(z!)) ? [x!, y!, z!] : [Math.min(4.5, Math.max(0.5, x!)), y!, 2.5] };
        }
        if (c.cmd === 'set') {
          if (덧.멈춤됨 !== false) 멈춤 = c.value === 'true';
          return { ok: true, value: 멈춤 };
        }
        if (c.cmd !== 'get') return { ok: true };
        const 값: Record<string, unknown> = { 'Transform.position': 덧.자리 ?? [0.5, 1, 0.5], 'NavMeshAgent.isStopped': 멈춤, 'NavMeshAgent.pathPending': 덧.늦음 === true, 'NavMeshAgent.pathStatus': 'PathComplete', 'Collider.bounds.center': [3, 0, 3], 'Collider.bounds.size': [2, 1, 2] };
        return { ok: true, value: 값[String(c.prop)] };
      },
      findAll: async () => [{ path: '/막음' }],
    };
    return { game: game as never, 부름 };
  };

  it('캐릭터를 멈춰 두고 칸 가운데를 목적지로 넣어 묻고, 끝나면 길을 지우고 멈춤을 되돌린다 · 캐릭터는 안 움직인다', async () => {
    const { game, 부름 } = 가짜게임();
    const r = await 게임훑기(game, 'stage:시험', '/고양이', ['//*[@name=막음]']);
    expect(r).toMatchObject({ 곳: 'stage:시험', 끊김: false, 못심음: [{ 중심: [3, 3], 반: [1, 1], 각: 0 }] });
    expect((r as 맵훑기).열림).toHaveLength(13);
    expect(부름[0]).toBe('get Transform.position');
    expect(부름.slice(-2)).toEqual(['call NavMeshAgent.ResetPath', 'set NavMeshAgent.isStopped']);
    expect(await 게임훑기({ call: async () => ({ ok: false }), findAll: async () => [] } as never, '곳', '/없음', [])).toMatchObject({ 틀림: expect.stringContaining('NavMeshAgent') });
  });

  it('묻는 동안 게임이 멈춤을 풀면 다시 멈추고 언제 풀렸는지 남긴다', async () => {
    const r = (await 게임훑기(가짜게임({ 풀기: 5 }).game, '곳', '/고양이', [])) as 맵훑기;
    expect(r.열림).toHaveLength(13);
    expect(r.풀림).toEqual([{ 물은수: 20, 초: expect.any(Number), 자리: [0.5, 1, 0.5], 멈춤: false }]);
  });

  it('캐릭터 칸이 벽 옆이라 안 열리면 둘레 칸에서 시작하고, 둘레도 다 막혔으면 남기지 않는다', async () => {
    // 캐릭터가 벽 칸(2,0)에 서 있다 — 옆 칸(1,0)에서 번진다
    expect(((await 게임훑기(가짜게임({ 자리: [2.5, 1, 0.5] }).game, '곳', '/고양이', [])) as 맵훑기).열림).toHaveLength(13);
    expect(await 게임훑기(가짜게임({ 자리: [20.5, 1, 20.5] }).game, '곳', '/고양이', [])).toMatchObject({ 틀림: expect.stringContaining('둘레 칸') });
  });

  it('멈춤을 못 켜면 캐릭터가 걸어가니 묻지 않고, 길 계산이 끝나지 않은 칸은 열린 칸으로 치지 않는다', async () => {
    expect(await 게임훑기(가짜게임({ 멈춤됨: false }).game, '곳', '/고양이', [])).toMatchObject({ 틀림: expect.stringContaining('isStopped') });
    expect(await 게임훑기(가짜게임({ 늦음: true }).game, '곳', '/고양이', [])).toMatchObject({ 틀림: expect.stringContaining('둘레 칸') });
  }, 30_000);
});

describe('훑기가 있는 격자', () => {
  const 훑기 = { 열림: [[0, 0], [1, 0], [1, 1], [0, 1]] as Array<[number, number]>, 막힘: [[2, 0], [2, 1]] as Array<[number, number]>, 끊김: false };

  it('다 물었으면 열린 칸 밖은 막힘이고 걷기 값이 없어도 짓는다 · 판에서 걸은 칸은 그 위에 칠한다', () => {
    const g = 격자짓기(undefined, [], [{ 걸음: [[5.5, 0.5]], 못감: [] }], 'xz', [], 훑기) as 격자;
    expect(칸값(g, 1, 1)).toBe(걸음됨);
    expect(칸값(g, 3, 3)).toBe(막힘);
    expect(칸값(g, 5, 0)).toBe(걸음됨);
    expect(길내기(g, [0.5, 0.5], [3.5, 3.5])).toMatchObject({ 요약: expect.stringContaining('도착이 막혀') });
  });

  it('게임이 열렸다고 한 칸은 AI 가 적은 막힘 값보다 믿는다', () => {
    const g = 격자짓기(undefined, { 사각형: [[0, 0], [1.9, 1.9]] }, [], 'xz', [], 훑기) as 격자;
    expect(칸값(g, 0, 0)).toBe(걸음됨);
  });

  it('다 못 물었으면(끊김) 묻지 않은 칸은 모름으로 둔다', () => {
    const g = 격자짓기([[0, 0]], [], [], 'xz', [[4, 4]], { ...훑기, 끊김: true }) as 격자;
    expect(칸값(g, 3, 3)).toBe(모름);
    expect(칸값(g, 2, 0)).toBe(막힘);
  });
});

describe('못 심는 곳 자리후보 빼기', () => {
  const 자료 = mkdtempSync(join(tmpdir(), 'nav-'));
  afterAll(() => rmSync(자료, { recursive: true, force: true }));

  it('맵 훑기의 못 심는 곳 안 자리후보는 시뮬이 안 고른다 · 훑기가 없으면 그대로', () => {
    const m = 입력읽기({ 계산: '시뮬', 곳: 'stage:시험', 지킬것: { 체력: 10, 자리: [10, 0] }, 길: { 가: [[0, 0], [10, 0]] }, 적종류: [{ 이름: '슬라임', 체력: 10, 속도: 1, 닿으면피해: 5, 보상: 1 }], 웨이브: [{ 이름: '1웨이브', 출현: [{ 종류: '슬라임', 수: 1, 간격: 0, 길: '가' }] }], 설치물종류: [{ 이름: '탑', 레벨: [{ 값: 0, 사거리: 3, 공격력: 5, 간격: 2 }] }], 설치물둘레: { 반경: 0.5, 근거: 'rule:둘레' }, 자리후보: [[5, 1], [3, 3], [8, 2]], 캐릭터: { 자리: [5, 1], 걷기속도: 1 }, 재화: { 시작: 0 }, 볼값연결: {}, 정책: [{ 조건: [], 행동: { 무엇: '놓기', 대상: '탑' } }] });
    if ('틀림' in m) throw new Error(m.틀림);
    expect(못심는곳빼기(자료, m)).toMatchObject({ 뺀: 0 });
    mkdirSync(join(자료, 'game-nav'), { recursive: true });
    const 훑음: 맵훑기 = { 곳: 'stage:시험', 칸크기: 1, 열림: [], 막힘: [], 끊김: false, 못심음: [{ 중심: [3, 3], 반: [1, 1], 각: 0 }, { 중심: [8, 2], 반지름: 0.5 }], 캐릭터: '/고양이', 때: '2026-11-29' };
    writeFileSync(훑기파일(자료, 'stage:시험'), JSON.stringify(훑음));
    const r = 못심는곳빼기(자료, m);
    expect(r.뺀).toBe(2);
    expect(r.모델.자리후보).toEqual([[5, 1]]);
  });

  it('못 심는 곳을 빼고 계산했으면 케이스 순서자료도 뺀 자리후보로 판을 한다', () => {
    const r = { 이름: '시뮬', 글: '', 줄글: [], 결과: { 계산: '시뮬', 이김: true, 정책: [], 버금: [], 손: { 행동초: 0.5 }, 자리후보: [[5, 1]] }, 입력요약: {} };
    expect(순서자료(r, { 곳: 'stage:시험', 자리후보: [[5, 1], [3, 3]] })).toMatchObject({ 입력: { 자리후보: [[5, 1]] } });
    expect(순서자료({ ...r, 결과: { ...r.결과, 자리후보: undefined } }, { 곳: 'stage:시험', 자리후보: [[5, 1], [3, 3]] })).toMatchObject({ 입력: { 자리후보: [[5, 1], [3, 3]] } });
  });
});

describe('거쳐 갈 점 곧게 펴기', () => {
  it('막힘 칸을 안 지나면 먼 점으로 건너뛰고, 막힘을 돌아가는 길은 꺾임을 남긴다', () => {
    const g = 격자짓기([[0, 0], [10, 10]], { 사각형: [[4, 0], [5.9, 6.9]] }, []) as 격자;
    // 비스듬히 칸마다 꺾인 길도 앞이 트였으면 한 번에 간다
    expect(곧게펴기(g, [[0.5, 9.5], [1.5, 8.5], [2.5, 8.5], [3.5, 7.5], [4.5, 7.5], [9.5, 9.5]])).toEqual([[0.5, 9.5], [9.5, 9.5]]);
    const 돌아감 = 길내기(g, [0.5, 0.5], [9.5, 0.5]);
    const 편 = 곧게펴기(g, '점들' in 돌아감 ? 돌아감.점들 : []);
    expect(편.length).toBeGreaterThan(2);
    expect(편[0]).toEqual([0.5, 0.5]);
    expect(편.at(-1)).toEqual([9.5, 0.5]);
  });
});
