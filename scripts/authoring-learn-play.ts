// 게임 배우기의 곳(STAGE 줄) — 맵 정보 일곱 종류 검사 · 맵을 다 안 채운 곳 · 곳마다 깸 · 판 수 (도메인/게임 §3.10 「맵 파악」 「게임플레이」)
// 장면 처음부터 있던 NavMesh · 막힘 오브젝트를 한 번도 안 열고 놓을 자리를 한 칸씩 찍어 봤다(#16053) — 곳마다 맵을 다 적어야 배우기가 끝난다
import type { 지도줄 } from './authoring-game-find.js';
import { type 판기록, 값찾기, 같나, 수로 } from './authoring-learn-check.js';

/** 곳마다 data.맵 에 다 채워야 하는 종류 — 그 게임에 없는 종류는 { 없음: <이유> } */
export const 맵종류 = ['걷기', '막힘', '놓기', '적', '지킬것', '자원', '출구'] as const;

type 줄 = Pick<지도줄, 'kind' | 'key' | 'learned'>;
const 객체 = (v: unknown): Record<string, unknown> => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const 글인가 = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';
const 칸 = (x: 줄 | undefined): Record<string, unknown> => 객체(x?.learned?.data);

const 맵꼴 = `data.맵 은 { ${맵종류.join(' · ')} } 이고 종류마다 { 주소, 칸?, 값, 본때 } 나 { 없음: <이유> } 다 — 주소는 다시 읽을 자리, 값은 게임 좌표(점 목록 · 사각형 · 선), 본때는 그것을 본 판 기록 이름`;

/** 살아 있는 곳 줄 — 뒤집힌 줄은 뺀다 */
export const 곳줄들 = <T extends 줄>(줄들: readonly T[]): T[] => 줄들.filter((x) => x.kind === 'STAGE' && x.learned !== null && x.learned.belief !== 'OVERTURNED');

/**
 * 곳 줄의 data.맵 을 받기 전에 본다 — 틀리면 까닭 글. 다 안 채워도 받는다(채웠나는 맵빈곳이 본다).
 * 본 적 없는 맵을 적지 못하게 — 그 장면에서 부른 판 기록이 있어야 하고, 종류마다 본때가 그 장면의 판 기록이어야 한다
 */
export function 맵검사(data: unknown, 기록들: readonly 판기록[]): string | null {
  const d = 객체(data);
  if (d.맵 === undefined) return null;
  const 맵 = 객체(d.맵);
  if (!글인가(d.장면)) return 'data.장면 에 이 곳의 장면 이름을 적는다 — 맵은 장면마다 적는다(`npx control-cli -s=g scenes` 의 active)';
  const 장면 = d.장면;
  const 이장면 = (r: 판기록): boolean => r.장면들?.includes(장면) === true;
  if (!기록들.some(이장면)) return `장면 ${장면} 에서 조작 도우미를 부른 판 기록이 없다 — 가 본 장면의 맵만 적는다`;
  const 모름 = Object.keys(맵).filter((k) => !(맵종류 as readonly string[]).includes(k));
  if (모름.length > 0) return `data.맵 에 모르는 종류 ${모름.join(' · ')} — ${맵꼴}`;
  for (const k of 맵종류) {
    const x = 맵[k];
    if (x === undefined || 글인가(객체(x).없음)) continue;
    const y = 객체(x);
    if (!글인가(y.주소) || (y.칸 !== undefined && !글인가(y.칸)) || y.값 === undefined || y.값 === null || !글인가(y.본때)) return `data.맵.${k} 가 틀렸다 — ${맵꼴}`;
    const 본 = 기록들.find((r) => r.이름 === y.본때);
    if (본 === undefined || !이장면(본)) return `data.맵.${k}.본때 ${y.본때} 가 장면 ${장면} 에서 부른 판 기록이 아니다 — 그 종류를 읽은 판의 기록 이름을 적는다`;
  }
  return null;
}

/** 맵을 다 채웠나 — 일곱 종류가 다 있다(꼴은 적을 때 맵검사가 봤다) */
export const 맵다됨 = (x: 줄): boolean => 맵종류.every((k) => 객체(칸(x).맵)[k] !== undefined);

/** 가 본 곳(가봄 · 못깸) 가운데 맵 일곱 종류를 다 안 채운 곳의 열쇠 */
export const 맵빈곳 = (줄들: readonly 줄[]): string[] => 곳줄들(줄들).filter((x) => (칸(x).상태 === '가봄' || 칸(x).상태 === '못깸') && !맵다됨(x)).map((x) => x.key);

/** 곳마다 이만큼 해 보고도 못 깨면 「못깸」 + 까닭을 적고 다음 곳으로 간다 (2026-11-26 사용자) */
export const 판상한 = 50;

type 결과조건 = string | { 이상: number } | { 이하: number };
/** 깰 곳의 결과 자리 — 판이 끝난 순간 이 자리를 읽어 깸 · 짐을 가른다. 칸이 없으면 화면 글자 */
export interface 결과 { 주소: string; 칸?: string; 깸: 결과조건; 짐: 결과조건 }

const 조건인가 = (v: unknown): v is 결과조건 => 글인가(v) || (Object.keys(객체(v)).length === 1 && (typeof 객체(v).이상 === 'number' || typeof 객체(v).이하 === 'number'));
const 결과꼴 = 'data.결과 는 { 주소, 칸?, 깸, 짐 } 이다 — 깸 · 짐은 판이 끝난 순간 그 자리의 글(「승 리」) 이나 { 이상: <수> } · { 이하: <수> }. 칸이 없으면 화면 글자를 읽는다';

/** 곳 줄의 결과 칸 — 없으면 null(깰 곳이 아니다 · 메뉴 · 랭킹 창), 꼴이 틀리면 까닭 글 */
export function 결과읽기(data: unknown): 결과 | null | string {
  const r = 객체(data).결과;
  if (r === undefined) return null;
  const x = 객체(r);
  if (!글인가(x.주소) || (x.칸 !== undefined && !글인가(x.칸)) || !조건인가(x.깸) || !조건인가(x.짐)) return 결과꼴;
  return { 주소: x.주소, ...(x.칸 === undefined ? {} : { 칸: x.칸 as string }), 깸: x.깸, 짐: x.짐 };
}

/** 판 기록 하나가 깸인가 짐인가 — 끝난 순간 결과 자리가 어느 쪽으로도 안 읽히면 판이 아니다(멈춤으로 쪼개진 조각 · 끝까지 안 간 부르기) */
export function 판결과(기록: 판기록, 결: 결과): '깸' | '짐' | null {
  const v = 값찾기(기록, 결.칸 === undefined ? { 주소: 결.주소 } : { 주소: 결.주소, 칸: 결.칸 });
  if (v === undefined || v === null) return null;
  const 맞나 = (c: 결과조건): boolean => (typeof c === 'string' ? 같나(v, c) : '이상' in c ? (수로(v) ?? -Infinity) >= c.이상 : (수로(v) ?? Infinity) <= c.이하);
  return 맞나(결.깸) ? '깸' : 맞나(결.짐) ? '짐' : null;
}

export interface 곳판 { 열쇠: string; 판: number; 깸: number; 못깸?: string }

/** 계획 줄이 적은 곳 — 판 기록의 계획에서 곳을 찾는다 */
export const 계획곳 = (줄들: readonly 줄[], 계획: string): unknown => 칸(줄들.find((x) => x.key === 계획 && x.learned !== null)).곳;

/** 깰 곳(결과 칸이 있는 곳)마다 판 수 · 깬 수 — 판은 그 곳을 적은 계획(data.곳)으로 해 본 기록 가운데 결과가 읽힌 것 */
export function 곳셈(줄들: readonly 줄[], 기록들: readonly 판기록[]): 곳판[] {
  return 곳줄들(줄들).flatMap((x) => {
    const 결 = 결과읽기(칸(x));
    if (결 === null || typeof 결 === 'string') return [];
    // 판 중간 멈춤으로 끝난 기록은 판이 아니다 — 결과를 수로 읽는 곳은 도는 중의 값도 깸 · 짐 어느 한쪽에 걸린다
    const 들 = 기록들.flatMap((r) => (r.값기록 !== undefined && r.멈춤 === undefined && 계획곳(줄들, r.값기록.계획) === x.key ? [판결과(r, 결)] : [])).filter((v) => v !== null);
    const d = 칸(x);
    return [{ 열쇠: x.key, 판: 들.length, 깸: 들.filter((v) => v === '깸').length, ...(d.상태 === '못깸' && 글인가(d.까닭) ? { 못깸: d.까닭 } : {}) }];
  });
}

/** 게임플레이가 끝났나 — 남은 것(빈 목록이면 끝). 깰 곳이 하나도 없으면 끝이 아니다 */
export function 남은깰곳(줄들: readonly 줄[], 기록들: readonly 판기록[]): string[] {
  const 셈 = 곳셈(줄들, 기록들);
  if (셈.length === 0) return ['깰 곳(data.결과 가 있는 STAGE)이 없다'];
  const 남은 = 셈.filter((x) => x.깸 === 0 && x.못깸 === undefined);
  return 남은.length === 0 ? [] : [`아직 못 깬 곳 ${남은.length}(${남은.slice(0, 5).map((x) => `${x.열쇠} ${x.판}판`).join(' · ')})`];
}

/** 곳의 맵 정보 — 그 곳 STAGE 의 맵 종류(`<곳>#<종류>`, 없음이 아닌 것)와 data.곳 이 그 곳인 줄(계획 · 회고 빼고) */
export function 곳맵(줄들: readonly 줄[], 곳: string): { 열쇠: string; 글: string }[] {
  const 맵 = 객체(칸(줄들.find((x) => x.key === 곳 && x.learned !== null)).맵);
  return [
    ...맵종류.filter((k) => 맵[k] !== undefined && !글인가(객체(맵[k]).없음)).map((k) => ({ 열쇠: `${곳}#${k}`, 글: JSON.stringify(맵[k]) })),
    ...줄들.filter((x) => x.learned !== null && x.key !== 곳 && x.kind !== 'TRIAL' && x.kind !== 'PLAY' && 칸(x).곳 === 곳).map((x) => ({ 열쇠: x.key, 글: x.learned!.text })),
  ];
}

/** 멈춤 보고에 붙이는 그 곳 맵 정보 — 열쇠와 글 앞 100자 */
export function 곳맵줄(줄들: readonly 줄[], 곳: string): string[] {
  const 들 = 곳맵(줄들, 곳);
  return [`그 곳(${곳})의 맵 정보 ${들.length} — 새 계획의 data.쓸것 에 믿고 쓸 것을 적는다`, ...들.slice(0, 15).map((x) => `  ${x.열쇠}: ${x.글.replace(/\s+/g, ' ').slice(0, 100)}`)];
}

/** 게임플레이 단계에서 계획으로 해 보기 전에 본다 — 막을 까닭 글, 괜찮으면 null */
export function 놀이막기(계획: { 곳?: string; 쓸것?: readonly string[] }, 줄들: readonly 줄[], 기록들: readonly 판기록[]): string | null {
  if (계획.곳 === undefined) return '게임플레이에서는 계획에 data.곳(해 볼 STAGE 줄 열쇠)을 적는다 — 판 수 · 깸을 곳마다 센다';
  const 셈 = 곳셈(줄들, 기록들).find((x) => x.열쇠 === 계획.곳);
  if (셈 === undefined) return `${계획.곳} 는 깰 곳이 아니다 — 그 STAGE 줄에 data.결과 { 주소, 칸?, 깸, 짐 } 을 먼저 적는다`;
  if (셈.못깸 !== undefined) return `${계획.곳} 는 못깸으로 적었다 — 아직 못 깬 다른 곳을 해 본다`;
  if (셈.깸 === 0 && 셈.판 >= 판상한) return `${계획.곳} 를 ${셈.판}판 해 보고도 못 깼다 — 그 STAGE 줄에 data.상태 「못깸」과 data.까닭(왜 못 깼나)을 적고 다음 곳으로 간다`;
  // 배우기에서 파악한 맵을 쓰게 — 한 칸씩 찍어 보며 놓을 자리를 찾던 것을 되풀이하지 않게(#16053)
  const 맵 = new Set(곳맵(줄들, 계획.곳).map((x) => x.열쇠));
  const 쓸것 = 계획.쓸것 ?? [];
  const 없는 = 쓸것.filter((k) => !맵.has(k) && !줄들.some((x) => x.key === k && x.learned !== null));
  if (없는.length > 0) return `data.쓸것 의 ${없는.join(' · ')} 가 지도에 없다`;
  // 맵 일곱 종류가 다 없음이고 딸린 줄도 없는 곳(메뉴 꼴)은 쓸 맵 정보가 없다 — 막으면 그 곳을 영영 못 한다
  if (맵.size > 0 && !쓸것.some((k) => 맵.has(k))) return `계획의 data.쓸것 에 ${계획.곳} 의 맵 정보를 하나 이상 적는다(${[...맵].slice(0, 8).join(' · ')})`;
  return null;
}

/** 곳마다 한 토막 — PR 머리 · 인수인계에 싣는다 */
export const 곳글 = (x: 곳판): string => `${x.열쇠} ${x.깸 > 0 ? `깸(${x.판}판 중 ${x.깸})` : x.못깸 !== undefined ? `못 깸(${x.판}판 · ${x.못깸})` : `아직(${x.판}판)`}`;
