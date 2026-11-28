// 게임 맵 훑기 — 맵에 들어간 뒤 캐릭터를 세워 둔 채 게임 NavMeshAgent 에 목적지만 넣어 칸마다 갈 수 있나 묻고, 못 심는 곳 오브젝트의 모양을 읽어 자료 폴더에 남긴다 (도메인/게임 §3.10 「맵 파악」)
// 쓰는 법: npx tsx scripts/authoring-game-nav.ts <자료 폴더> <곳 열쇠> <캐릭터 주소> [--막음 '<선택자>']… [--상한 <칸 수>]
// 2026-11-29 사용자 — 손이 곧게 가다 막히고(셋째 맵 이동 0/8) 격자가 대부분 모름(둘째 맵 3038칸 중 2718)이었다. SDK 를 안 고치고 지금 빌드로 된다(11-29 둘째 맵 · 칸 1922개 4분 50초 · 두 번 같은 결과)
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { gameLink } from '@platform/kit/game';
import { Game, type Link } from 'control-cli';

import { type 막음모양, type 맵훑기, 훑기파일 } from './authoring-game-nav-file.js';
import { 칸크기 } from './authoring-game-path.js';
import { 게임환경 } from './authoring-run3-env.js';
import { 잡은폰 } from './authoring-run3-game.js';

/** 한 번에 묻는 칸 수 상한(첫 값) — 칸마다 0.2초 안팎이라 셸 한도(10분) 안에 끝난다 */
export const 기본상한 = 2500;
/** 이만큼 지나면 묻기를 그만두고 여기까지 남긴다(첫 값 · 셸 한도 10분에 남기고 되돌릴 시간을 남긴다) */
export const 훑기한도ms = 8 * 60_000;
/** 이만큼 물을 때마다 멈춤이 풀렸나 본다(첫 값) */
export const 멈춤보기칸 = 20;
/** 목적지를 게임이 이보다 멀리 옮기면 그 칸은 걸을 곳이 아니다(칸 반 변) */
const 옮김한도 = 칸크기 / 2;

/**
 * 시작 칸에서 네 이웃으로 번지며 칸마다 묻는다 — 열린 칸만 번지고 막힌 칸은 가장자리로 남는다. 상한 · 한도에 닿으면 끊김.
 * 다 물었으면 열린 칸들은 막힌 칸 띠로 둘러싸여, 그 밖은 캐릭터가 못 가는 곳이다
 */
export async function 번져채우기(시작: [number, number], 묻기: (i: number, j: number) => Promise<boolean>, 상한: number, 그만?: () => boolean): Promise<Pick<맵훑기, '열림' | '막힘' | '끊김'>> {
  const 본 = new Set<string>([`${시작[0]},${시작[1]}`]);
  const 줄: Array<[number, number]> = [시작];
  const 열림: Array<[number, number]> = [];
  const 막힘: Array<[number, number]> = [];
  while (줄.length > 0) {
    if (열림.length + 막힘.length >= 상한 || 그만?.() === true) return { 열림, 막힘, 끊김: true };
    const [i, j] = 줄.shift()!;
    if (!(await 묻기(i, j))) {
      막힘.push([i, j]);
      continue;
    }
    열림.push([i, j]);
    for (const [a, b] of [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]] as Array<[number, number]>) {
      if (본.has(`${a},${b}`)) continue;
      본.add(`${a},${b}`);
      줄.push([a, b]);
    }
  }
  return { 열림, 막힘, 끊김: false };
}

const 벡 = (v: unknown): [number, number, number] | null => (Array.isArray(v) && v.length === 3 && v.every((x) => typeof x === 'number') ? (v as [number, number, number]) : null);
const 수 = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** 오브젝트 하나의 바닥 모양 — 상자 충돌체(돌림 · 크기 반영) → 구 충돌체 → 충돌체 테두리 상자 차례. 충돌체가 없으면 null */
export async function 모양읽기(읽기: (prop: string) => Promise<unknown>): Promise<막음모양 | null> {
  const [자리, 각, 배] = [벡(await 읽기('Transform.position')), 벡(await 읽기('Transform.eulerAngles')), 벡(await 읽기('Transform.lossyScale'))];
  const [상중, 상크] = [벡(await 읽기('BoxCollider.center')), 벡(await 읽기('BoxCollider.size'))];
  if (자리 !== null && 각 !== null && 배 !== null && 상중 !== null && 상크 !== null) {
    const r = (각[1] * Math.PI) / 180;
    const [lx, lz] = [상중[0] * 배[0], 상중[2] * 배[2]];
    return { 중심: [자리[0] + lx * Math.cos(r) + lz * Math.sin(r), 자리[2] - lx * Math.sin(r) + lz * Math.cos(r)], 반: [Math.abs(상크[0] * 배[0]) / 2, Math.abs(상크[2] * 배[2]) / 2], 각: 각[1] };
  }
  const [구중, 구반] = [벡(await 읽기('SphereCollider.center')), 수(await 읽기('SphereCollider.radius'))];
  if (자리 !== null && 각 !== null && 배 !== null && 구중 !== null && 구반 !== null) {
    const r = (각[1] * Math.PI) / 180;
    const [lx, lz] = [구중[0] * 배[0], 구중[2] * 배[2]];
    return { 중심: [자리[0] + lx * Math.cos(r) + lz * Math.sin(r), 자리[2] - lx * Math.sin(r) + lz * Math.cos(r)], 반지름: 구반 * Math.max(Math.abs(배[0]), Math.abs(배[2])) };
  }
  const [테중, 테크] = [벡(await 읽기('Collider.bounds.center')), 벡(await 읽기('Collider.bounds.size'))];
  return 테중 === null || 테크 === null ? null : { 중심: [테중[0], 테중[2]], 반: [테크[0] / 2, 테크[2] / 2], 각: 0 };
}

const 쉬기 = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/**
 * 게임에 맵을 묻는다 — 캐릭터의 NavMeshAgent 를 멈춰 두고 칸 가운데를 목적지로 넣어, 게임이 옮긴 목적지가 칸 안이고 길이 끝까지 나면 열린 칸.
 * 끝나면 길을 지우고 멈춤을 처음 값으로 되돌린다. 판을 하는 것이 아니라 지도를 보는 것이다 — 그래도 캐릭터가 옮겨지면 풀림에 남긴다
 */
export async function 게임훑기(game: Pick<Game, 'call' | 'findAll'>, 곳: string, 캐릭터: string, 막음들: readonly string[], 상한 = 기본상한, 한도ms = 훑기한도ms): Promise<맵훑기 | { 틀림: string }> {
  const 읽기 = async (target: string, prop: string): Promise<unknown> => ((await game.call({ cmd: 'get', target, prop }).catch(() => ({ ok: false }))) as { value?: unknown }).value;
  const 쓰기 = async (prop: string, value: string): Promise<unknown> => ((await game.call({ cmd: 'set', target: 캐릭터, prop, value })) as { value?: unknown }).value;
  const 처음 = 벡(await 읽기(캐릭터, 'Transform.position'));
  const 멈춤 = await 읽기(캐릭터, 'NavMeshAgent.isStopped');
  if (처음 === null || typeof 멈춤 !== 'boolean') return { 틀림: `${캐릭터} 의 자리나 NavMeshAgent 를 못 읽었다 — 맵에 들어가 캐릭터가 나온 뒤 부르고, 캐릭터 주소가 NavMeshAgent 가 붙은 오브젝트인지 본다` };
  const 시작때 = Date.now();
  await 쓰기('NavMeshAgent.isStopped', 'true').catch(() => undefined);
  // 멈추지 않았으면 캐릭터가 목적지마다 걸어가 판을 바꾼다 — 묻지 않는다
  if ((await 읽기(캐릭터, 'NavMeshAgent.isStopped')) !== true) return { 틀림: `${캐릭터} 의 NavMeshAgent.isStopped 를 못 켰다 — 캐릭터가 움직이므로 묻지 않는다` };
  try {
    // 멈춤이 풀리거나 캐릭터가 옮겨지면 몇 칸마다 보고 다시 멈추고 기록한다 — 11-29 둘째 맵 5분 훑기 두 번에 멈춤은 안 풀렸는데 캐릭터가 15 쯤 옮겨져 있었다(이유 모름 · 두 번의 맵 결과는 칸 하나까지 같았다).
    // 게임 시간을 0 으로 멈추면 길 계산도 멈춰 안 된다(같은 날 시험 · 13초에 열린 칸 4)
    const 풀림: 맵훑기['풀림'] = [];
    let 물은수 = 0;
    const 묻기 = async (i: number, j: number): Promise<boolean> => {
      if ((물은수 += 1) % 멈춤보기칸 === 0) {
        const [멈춤지금, 자리] = [await 읽기(캐릭터, 'NavMeshAgent.isStopped'), 벡(await 읽기(캐릭터, 'Transform.position')) ?? 처음];
        if (멈춤지금 !== true || Math.hypot(자리[0] - 처음[0], 자리[2] - 처음[2]) > 옮김한도) {
          풀림.push({ 물은수, 초: Math.round((Date.now() - 시작때) / 100) / 10, 자리, 멈춤: 멈춤지금 === true });
          if (멈춤지금 !== true) await 쓰기('NavMeshAgent.isStopped', 'true').catch(() => undefined);
        }
      }
      const [x, z] = [(i + 0.5) * 칸크기, (j + 0.5) * 칸크기];
      const 옮긴 = 벡(await 쓰기('NavMeshAgent.destination', `[${x},${처음[1]},${z}]`).catch(() => null));
      if (옮긴 === null || Math.hypot(옮긴[0] - x, 옮긴[2] - z) > 옮김한도) return false;
      // 길 계산이 아직이면 앞 칸의 결과가 읽힌다 — 2초를 넘으면 열린 칸으로 치지 않는다
      let 대기 = true;
      for (let k = 0; k < 40 && (대기 = (await 읽기(캐릭터, 'NavMeshAgent.pathPending')) === true); k += 1) await 쉬기(50);
      return !대기 && (await 읽기(캐릭터, 'NavMeshAgent.pathStatus')) === 'PathComplete';
    };
    // 캐릭터 칸 가운데가 벽 옆이라 안 열리면 둘레 칸에서 시작한다 — 열린 칸이 하나도 없으면 맵 전체가 막힘이 된다
    const [ci, cj] = [Math.floor(처음[0] / 칸크기), Math.floor(처음[2] / 칸크기)];
    let 시작: [number, number] | undefined;
    for (const [a, b] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]] as const) if (await 묻기(ci + a, cj + b)) { 시작 = [ci + a, cj + b]; break; }
    if (시작 === undefined) return { 틀림: `캐릭터 둘레 칸이 하나도 안 열렸다 — 캐릭터가 맵 위에 섰는지 · 캐릭터 주소가 맞는지 본다` };
    const 채움 = await 번져채우기(시작, 묻기, 상한, () => Date.now() - 시작때 > 한도ms);
    const 못심음: 막음모양[] = [];
    for (const 선택자 of 막음들) {
      for (const f of await game.findAll(선택자)) {
        const 모양 = await 모양읽기((prop) => 읽기(f.path, prop));
        if (모양 !== null) 못심음.push(모양);
      }
    }
    return { 곳, 칸크기, ...채움, 못심음, 캐릭터, 때: new Date().toISOString(), ...(풀림.length === 0 ? {} : { 풀림 }) };
  } finally {
    await game.call({ cmd: 'call', target: 캐릭터, method: 'NavMeshAgent.ResetPath' }).catch(() => undefined);
    await 쓰기('NavMeshAgent.isStopped', String(멈춤)).catch(() => undefined);
  }
}

const 쓰는법 = "쓰는 법: npx tsx scripts/authoring-game-nav.ts <자료 폴더> <곳 열쇠> <캐릭터 주소> [--막음 '<선택자>']… [--상한 <칸 수>] — 맵에 들어가 캐릭터가 나온 뒤, 잡은 PC · 폰에서 부른다";

/** 명령 입출력 — 0 남겼다 · 1 게임에 못 물었다 · 2 인자가 틀렸다 */
export async function 실행(인자: string[], 트리 = process.cwd(), env: NodeJS.ProcessEnv = process.env, 길?: Link): Promise<number> {
  const 막음들: string[] = [];
  let 상한 = 기본상한;
  const 남음: string[] = [];
  for (let k = 0; k < 인자.length; k += 1) {
    if (인자[k] === '--막음' && 인자[k + 1] !== undefined) 막음들.push(인자[++k]!);
    else if (인자[k] === '--상한' && Number.isInteger(Number(인자[k + 1])) && Number(인자[k + 1]) > 0) 상한 = Number(인자[++k]);
    else 남음.push(인자[k]!);
  }
  const [자료, 곳, 캐릭터] = 남음;
  if (자료 === undefined || 곳 === undefined || 캐릭터 === undefined || 남음.length > 3) {
    console.error(`[맵 훑기] 인자가 틀렸다\n${쓰는법}`);
    return 2;
  }
  const 폰 = 잡은폰(트리);
  if (길 === undefined && 폰 === null) {
    console.error('[맵 훑기] 잡은 디바이스가 없다 — `npx control-cli hold --minutes 30`(PC 게임은 `--pc`)으로 잡고 맵에 들어간 뒤 부른다');
    return 2;
  }
  let r: 맵훑기 | { 틀림: string };
  try {
    r = await 게임훑기(new Game(길 ?? (await gameLink({ ...env, ...게임환경(폰!) }))), 곳, 캐릭터, 막음들, 상한);
  } catch (e) {
    r = { 틀림: `게임에 못 물었다 — ${e instanceof Error ? e.message : String(e)}` };
  }
  if ('틀림' in r) {
    console.error(`[맵 훑기] ${r.틀림}`);
    return 1;
  }
  mkdirSync(join(자료, 'game-nav'), { recursive: true });
  writeFileSync(훑기파일(자료, 곳), JSON.stringify(r));
  if (r.풀림 !== undefined) console.log(`[맵 훑기] 묻는 동안 캐릭터가 ${r.풀림.length}번 옮겨졌거나 멈춤이 풀렸다(처음 ${r.풀림[0]!.초}초 · 자리 ${r.풀림[0]!.자리.join(',')} · 멈춤 ${r.풀림[0]!.멈춤 ? '그대로' : '풀림'}) — 맵 지도는 같지만 판이 바뀌었을 수 있다`);
  console.log(`[맵 훑기] ${곳} — 열린 칸 ${r.열림.length} · 막힌 칸 ${r.막힘.length}${r.끊김 ? ' · 상한이나 한도에 닿아 다 못 물었다(나머지는 모름으로 둔다 · --상한 을 올려 다시 부른다)' : ''} · 못 심는 곳 ${r.못심음.length} → ${훑기파일(자료, 곳)}`);
  return 0;
}

if (process.argv[1] !== undefined && /authoring-game-nav\.[tj]s$/.test(process.argv[1])) process.exit(await 실행(process.argv.slice(2)));
