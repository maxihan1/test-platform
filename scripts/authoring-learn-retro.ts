// 게임 배우기의 회고 · 다음 해 보기 막기 · 끝 조건 — 조작 도우미 · 적는 명령 · 에이전트가 같이 쓴다 (도메인/게임 §3.10 「회고」 · 「끝내는 때」)
// 지침만으로는 회고를 1~3분에 건너뛰고 같은 작전을 일곱 판 되풀이했다(2026-11-26 다섯 번째 실측) — 칸을 정하고 안 채우면 다음 해 보기를 안 돌린다
import { lstatSync } from 'node:fs';
import { join } from 'node:path';

import type { 배운것 } from '../apps/admin/src/prd/gameKinds.js';
import { 게임자리 } from './authoring-game.js';
import type { 지도줄 } from './authoring-game-find.js';
import { 열린물음, 오늘글 } from './authoring-game-tree.js';
import { type 기대, type 볼값, type 판기록, 가장큰, 결과이름, 계획읽기, 기대글, 놀이계획검사, 어긋난기대, 까닭들, 나아감, 나아감열쇠, 나아감자리, 회고기록이름, 회고머리 } from './authoring-learn-check.js';
import { 멈춤표시읽기 } from './authoring-game-freeze.js';
import { 놀이시작뒤, 놀이회고뒤, 상태읽기 } from './authoring-learn-io.js';
import { 결과읽기, 계산안고침, 계산찍기, 곳안늚, 맵빈곳, 맵종류, 놀이막기 } from './authoring-learn-play.js';
import { 새로쓰기, 안전히읽기 } from './authoring-screens-keep-io.js';

/** 계획 없이 돌릴 수 있는 길이 — 물음 하나를 짧게 재는 부르기. 그보다 길면 해 보기라 계획과 회고가 있어야 한다 */
export const 계획없이초 = 60;
/** 이만큼 이어 해 보는 동안 지도가 안 늘면 배우기를 끝낸다 — 첫 값(실측 뒤 고친다) */
export const 안늚상한 = 5;
/** 「손」이 이만큼 이어지고 나아감이 안 늘면 다음 계획은 다른 곳이어야 한다 */
const 손상한 = 3;

type 줄 = Pick<지도줄, 'kind' | 'key' | 'learned'>;
const 객체 = (v: unknown): Record<string, unknown> => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const 글인가 = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';
const 칸 = (x: 줄 | undefined): Record<string, unknown> => 객체(x?.learned?.data);

/** 회고 줄 — 판 기록 이름이 열쇠인 PLAY 줄. 이름순이 시간순이다 */
export const 회고줄들 = (줄들: readonly 줄[]): 줄[] => 줄들.filter((x) => x.kind === 'PLAY' && x.learned !== null && 회고기록이름(x.key) !== null).sort((a, b) => (a.key < b.key ? -1 : 1));

/**
 * 회고 줄을 받기 전에 본다 — 칸이 맞으면 기록에서 읽은 것(목표에 닿은 수 · 나아감 · 처음 어긋난 때)을 data 에 채운 배운 것, 틀리면 까닭 글.
 * 찾기는 이번에 같이 적는 줄까지 얹은 지도에서 한다
 */
export function 회고채우기(열쇠: string, learned: 배운것, 찾기: (열쇠: string) => 줄 | undefined, 기록들: readonly 판기록[]): 배운것 | string {
  const 이름 = 회고기록이름(열쇠)!;
  const 기 = 기록들.find((r) => r.이름 === 이름)?.값기록;
  if (기 === undefined) return `판 기록 ${이름}.json 에 계획으로 해 본 값 기록이 없다 — 회고는 --plan 으로 해 본 판에만 단다`;
  const d = 객체(learned.data);
  if (!까닭들.includes(d.까닭 as (typeof 까닭들)[number])) return `data.까닭 은 ${까닭들.join(' · ')} 가운데 하나다(손 — 하려던 것이 판에서 안 됐다 · 믿은것 — 쓴 지도 줄이 틀렸다 · 몰랐던것 — 새 물음 · 됨 — 목표에 닿았다)`;
  if (d.까닭 === '믿은것' && (!글인가(d.열쇠) || 찾기(d.열쇠) === undefined)) return 'data.열쇠 에 틀린 것으로 드러난 지도 줄 열쇠를 적는다(지도에 있어야 한다)';
  if (d.까닭 === '몰랐던것' && (!글인가(d.열쇠) || 찾기(d.열쇠)?.kind !== 'ASK')) return 'data.열쇠 에 새로 단 물음(ASK) 줄 열쇠를 적는다(이번에 같이 적어도 된다)';
  const 다음 = 글인가(d.다음) ? 찾기(d.다음) : undefined;
  // 목표에 닿아 끝내는 마지막 회고에 지어낸 계획을 쓰게 하지 않는다
  if (!(d.까닭 === '됨' && d.다음 === undefined) && (다음?.kind !== 'TRIAL' || typeof 계획읽기(칸(다음)) === 'string')) return 'data.다음 에 다음에 해 볼 계획(TRIAL) 줄 열쇠를 적는다 — 그 줄에 볼값 · 기대 · 목표가 있어야 한다(이번에 같이 적어도 된다 · 까닭이 「됨」이면 안 적어도 된다)';
  const 계획 = 계획읽기(칸(찾기(기.계획)));
  const 목표 = typeof 계획 === 'string' ? null : { ...계획.목표, 닿은: 가장큰(기, 계획.목표.값) };
  return { ...learned, data: { ...d, 계획: 기.계획, ...(typeof 계획 === 'string' || 계획.곳 === undefined ? {} : { 곳: 계획.곳 }), ...(목표 === null ? {} : { 목표 }), 나아감: 가장큰(기, 나아감), 어긋남: 기.어긋남, ...(기.화면다름.length === 0 ? {} : { 화면다름: 기.화면다름 }) } };
}

/** 게임플레이에서 한 곳의 나아감이 이만큼 이어 안 늘면 다음 판 전에 물음 트리를 보게 막는다 — 배우기의 안늚상한(지도 전체)과 따로 곳 단위로 센다 */
export const 안늚판상한 = 3;

/**
 * 가장 새 회고의 곳(곳을 주면 그 곳)에서 회고 셋 이어 나아감이 그 앞의 가장 먼 나아감을 못 넘었으면 그 셋이 쓴 계획. 목표에 닿았거나(됨) 앞 회고가 없어 견줄 수 없으면 null.
 * 손막힘과 달리 까닭이 손이 아니어도 센다 — 믿은것 · 몰랐던것으로 고치고도 안 느는 곳이다
 */
export function 곳막힘(줄들: readonly 줄[], 어느곳?: string): { 곳: string; 계획들: string[] } | null {
  const 회고 = 회고줄들(줄들).filter((x) => 어느곳 === undefined || 칸(x).곳 === 어느곳);
  const 마지막 = 회고.at(-1);
  const 곳 = 칸(마지막).곳;
  if (마지막 === undefined || 칸(마지막).까닭 === '됨' || !글인가(곳)) return null;
  const 끝 = 곳안늚(줄들, 곳, 안늚판상한);
  return 끝 === null ? null : { 곳, 계획들: 끝.map((x) => 칸(x).계획).filter(글인가) };
}

/** 계획으로 해 본 가장 새 판 가운데 회고 줄이 없는 것 */
export function 회고없는판(기록들: readonly 판기록[], 줄들: readonly 줄[]): string | null {
  const 마지막 = [...기록들].reverse().find((r) => r.값기록 !== undefined);
  if (마지막 === undefined) return null;
  return 줄들.some((x) => x.key === `${회고머리}${마지막.이름}` && x.learned !== null) ? null : 마지막.이름;
}

/**
 * 손만 고친 회고가 한 곳에서 세 번 이어졌고 나아감이 그 곳의 앞 회고보다 안 늘었으면 그 세 번이 쓴 계획 · 어디서 — 다음 계획은 이것들이 아니어야 한다.
 * 나아감은 곳 안에서만 견준다 — 맵을 옮기면 웨이브가 1 로 돌아가 「안 늚」이 됐다(#16053)
 */
export function 손막힘(줄들: readonly 줄[]): { 계획들: string[]; 어디서들: string[] } | null {
  const 회고 = 회고줄들(줄들);
  if (회고.length <= 손상한) return null;
  const 끝셋 = 회고.slice(-손상한);
  const 곳 = 칸(끝셋[0]).곳;
  if (!끝셋.every((x) => 칸(x).까닭 === '손' && 칸(x).곳 === 곳)) return null;
  const 수 = (들: 줄[]): number => Math.max(-Infinity, ...들.map((x) => 칸(x).나아감).filter((v): v is number => typeof v === 'number'));
  if (수(끝셋) > 수(회고.slice(0, -손상한).filter((x) => 칸(x).곳 === 곳))) return null;
  const 계획들 = 끝셋.map((x) => 칸(x).계획).filter(글인가);
  const 어디서들 = 계획들.map((k) => 칸(줄들.find((x) => x.key === k)).어디서).filter(글인가);
  return { 계획들, 어디서들 };
}

/** 지도가 늘었나 보는 셈 — 확인 줄 · 가 본 곳 · 곳마다 가장 멀리 간 나아감(곳 없이 해 본 것은 빈 열쇠) */
export function 늚셈(줄들: readonly 줄[]): { 확인: number; 가봄: number; 나아감: Record<string, number> } {
  const 나아감: Record<string, number> = {};
  for (const x of 회고줄들(줄들)) {
    const v = 칸(x).나아감;
    const 곳 = 글인가(칸(x).곳) ? (칸(x).곳 as string) : '';
    if (typeof v === 'number') 나아감[곳] = Math.max(나아감[곳] ?? -Infinity, v);
  }
  return {
    확인: 줄들.filter((x) => x.kind !== 'KIND' && x.learned?.belief === 'CONFIRMED').length,
    가봄: 줄들.filter((x) => x.kind === 'STAGE' && 칸(x).상태 === '가봄').length,
    나아감,
  };
}

/** 해 볼 때마다 부른다 — 앞 해 보기 때보다 셋 다 안 늘었으면 하나 더 센다. 센 수를 돌려준다.
 * 마지막 기록 — 계획으로 해 본 가장 새 기록 이름. 그 뒤로 해 본 판이 없으면(붙지 못해 기록이 안 남았으면) 다시 세지 않는다 */
export function 늚재기(자료: string, 줄들: readonly 줄[], 마지막기록: string | null = null): number {
  const 지금 = 늚셈(줄들);
  let 앞: { 셈?: ReturnType<typeof 늚셈>; 안늚?: number; 기록?: string | null } = {};
  try {
    앞 = JSON.parse(안전히읽기(자료, 게임자리.늚, 10_000) ?? '{}') as typeof 앞;
  } catch {
    // 못 읽으면 처음부터 센다
  }
  if (앞.셈 !== undefined && (앞.기록 ?? null) === 마지막기록) return 앞.안늚 ?? 0;
  // 옛 꼴(나아감 하나)은 곳 없는 열쇠로 읽는다
  const 앞나아감 = typeof 앞.셈?.나아감 === 'number' ? { '': 앞.셈.나아감 } : 객체(앞.셈?.나아감);
  const 늘었나 = 앞.셈 === undefined || 지금.확인 > 앞.셈.확인 || 지금.가봄 > 앞.셈.가봄 || Object.entries(지금.나아감).some(([곳, v]) => v > (typeof 앞나아감[곳] === 'number' ? (앞나아감[곳] as number) : -Infinity));
  const 안늚 = 늘었나 ? 0 : (앞.안늚 ?? 0) + 1;
  새로쓰기(join(자료, 게임자리.늚), JSON.stringify({ 셈: 지금, 안늚, 기록: 마지막기록 }));
  return 안늚;
}

/**
 * 다 배웠나 — 남은 것을 돌려준다(빈 목록이면 다 배움). 열린 물음 · 가 보거나 못 가는 까닭이 안 적힌 곳 · 나아감 줄 · 맵을 다 안 채운 곳 ·
 * 안적은(마지막 판에 나왔거나 장면 처음부터 있던 것 가운데 지도에 없는 이름 — 부르는 쪽이 authoring-game-play-gate 로 읽는다)
 */
export function 남은배울것(지도: { 줄들: 지도줄[]; 이름: Map<string, string> }, 오늘: string, 빌드?: string, 안적은: readonly string[] = []): string[] {
  const 열린 = 열린물음(지도, 오늘, 빌드);
  const 곳들 = 지도.줄들.filter((x) => x.kind === 'STAGE' && x.learned !== null && x.learned.belief !== 'OVERTURNED');
  // 못깸은 가 본 곳이다 — 적는 명령은 단계와 상관없이 판 상한이 차면 받는다
  const 안간 = 곳들.filter((x) => !(칸(x).상태 === '가봄' || ((칸(x).상태 === '못감' || 칸(x).상태 === '못깸') && 글인가(칸(x).까닭))));
  return [
    ...(열린.length === 0 ? [] : [`열린 물음 ${열린.length}`]),
    ...(곳들.length === 0 ? ['갈 곳(STAGE) 줄이 없다'] : 안간.length === 0 ? [] : [`가 봤거나 못 가는 까닭이 안 적힌 곳 ${안간.length}`]),
    ...(나아감자리(칸(지도.줄들.find((x) => x.key === 나아감열쇠))) === null ? [`${나아감열쇠} 줄이 없다`] : []),
    ...(맵빈곳(지도.줄들).length === 0 ? [] : [`맵 ${맵종류.length}종류를 다 안 채운 곳 ${맵빈곳(지도.줄들).length}`]),
    ...(안적은.length === 0 ? [] : [`지도에 안 적은 오브젝트 ${안적은.length}(${안적은.slice(0, 5).join(' · ')})`]),
  ];
}

/** 곳 — 계획이 적은 곳. 판 중간 멈춤 보고에 그 곳 맵 정보를 붙인다 */
export interface 해볼것 { 계획: string; 볼값: 볼값[]; 기대: 기대[]; 곳?: string; 계산?: Record<string, string> }

/** 학습 세션(시험 아님) 동안만 있는 표시가 있나 */
export const 배우는중인가 = (자료: string | undefined): boolean => 자료 !== undefined && lstatSync(join(자료, 게임자리.배우는중), { throwIfNoEntry: false })?.isFile() === true;

/**
 * 학습 세션에서 조작 도우미를 부르기 전에 본다 — 막을 까닭 글, 계획으로 해 보면 그 계획, 짧은 재기면 null.
 * 학습 세션이 아니면(케이스를 쓰는 세션 · 시험) 막지 않는다
 */
export function 배움막기(자료: string | undefined, 초: number, 계획열쇠: string | undefined, 줄들: readonly 지도줄[], 기록들: readonly 판기록[]): { 막음: string } | 해볼것 | null {
  if (자료 === undefined || !배우는중인가(자료)) return null;
  const 없는 = 회고없는판(기록들, 줄들);
  if (없는 !== null) return { 막음: `앞 해 보기(${없는}.json)의 회고 줄(${회고머리}${없는})이 지도에 없다 — 회고를 적은 뒤 다시 부른다(지침 「회고」)` };
  if (계획열쇠 === undefined) return 초 > 계획없이초 ? { 막음: `${계획없이초}초 넘게 해 보려면 --plan <계획(TRIAL) 줄 열쇠> 를 붙인다 — 잘되면 어떤 숫자인지 적은 계획이 있어야 회고에서 어디서 어긋났는지 찾는다` } : null;
  const 찾기 = (k: string): 지도줄 | undefined => 줄들.find((x) => x.key === k && x.learned !== null);
  const 줄 = 찾기(계획열쇠);
  const 계획 = 줄?.kind === 'TRIAL' ? 계획읽기(칸(줄)) : `${계획열쇠} 는 지도의 계획(TRIAL) 줄이 아니다`;
  if (typeof 계획 === 'string') return { 막음: `계획을 못 읽었다 — ${계획}` };
  // 멈춘 판을 이어 돌릴 때 — 멈춘 순간 값으로 이미 깨진 기대는 계획이 아니다(그대로 돌리면 다시 바로 멈춘다)
  // 게임이 아직 그 멈춤에 멈춰 있을 때만 — 판을 새로 시작하면 멈춘 순간 값과 견줄 까닭이 없다
  const 멈춘 = 멈춤표시읽기(자료) === null ? undefined : 기록들.at(-1)?.멈춤;
  const 깨진 = 멈춘 === undefined ? null : 어긋난기대(계획.기대, 멈춘.값);
  if (깨진 !== null) return { 막음: `새 계획의 기대 「${기대글(깨진)}」 가 멈춘 순간 값(${Object.entries(멈춘!.값).map(([k, v]) => `${k} ${v ?? '못 읽음'}`).join(' · ')})으로 이미 깨졌다 — 지금 판에서 지킬 수 있는 기대로 다시 적는다` };
  const 나 = 나아감자리(칸(찾기(나아감열쇠)));
  if (나 === null) return { 막음: `${나아감열쇠} 줄(GOAL · data { 주소, 칸? })이 없다 — 이 게임에서 얼마나 나아갔나를 보여 주는 값(깬 맵 수 · 레벨 · 해금 수) 하나를 먼저 정해 적는다` };
  // 게임플레이를 다시 시작했으면 그 앞 판 · 회고는 판 수 · 세 판 안 늚 · 손 세 번에 안 센다(2026-11-27 사용자 — 판 함수를 고쳐 다시 깨 본다)
  const 놀이줄들 = 놀이회고뒤(자료, 줄들);
  const 놀이기록 = 놀이시작뒤(자료, 기록들);
  const 손 = 손막힘(놀이줄들);
  if (손 !== null && (손.계획들.includes(계획열쇠) || (글인가(칸(줄).어디서) && 손.어디서들.includes(칸(줄).어디서 as string)))) {
    return { 막음: `손만 고친 해 보기가 ${손상한}번 이어졌고 나아감이 안 늘었다 — 그 세 번이 쓴 계획(${손.계획들.join(' · ')})과 어디서(${손.어디서들.join(' · ') || '없음'})가 아닌 물음이나 곳으로 계획을 새로 적는다` };
  }
  // 게임플레이는 곳마다 깰 때까지 한다 — 다섯 번 안 늚으로 끝내지 않는다
  const 놀이 = 상태읽기(자료).단계 === '게임플레이';
  // 넘김판(열 판)이 물음 트리(세 판)보다 먼저다 — 열 판째에도 물음 트리로 보내면 정보 모으기 · 다음 맵으로 못 넘어간다
  const 놀막 = 놀이 ? (놀이계획검사(계획) ?? 놀이막기(계획, 줄들, 놀이기록) ?? 계산안고침(계획.쓸것 ?? [], 줄들, 놀이기록)) : null;
  if (놀막 !== null) return { 막음: 놀막 };
  // 곳 단위로 셋 이어 안 늘면 물음 트리를 보고 열린 물음 하나를 푸는 계획만 받는다(그 물음은 계획의 data.어디서)
  // 계획의 곳에서 잰다 — 가장 새 회고의 곳으로 재면 맵 시도 수를 채우고 다음 맵으로 옮긴 첫 계획이 앞 맵의 안 늚으로 막혔다(2026-11-27 작성 16094 넷째 → 다섯째 맵)
  const 막힘 = 놀이 ? 곳막힘(놀이줄들, 계획.곳) : null;
  const 열린 = 막힘 === null ? [] : 열린물음({ 줄들: [...줄들], 이름: new Map() }, 오늘글(Date.now())).map((x) => x.key);
  if (막힘 !== null && 열린.length > 0 && (막힘.계획들.includes(계획열쇠) || !열린.includes(칸(줄).어디서 as string))) {
    return { 막음: `${막힘.곳} 에서 ${안늚판상한}판 이어 나아감이 안 늘었다 — 물음 트리(\`npx tsx scripts/authoring-game-tree.ts ${자료}\`)를 보고 열린 물음 하나를 골라, 그 물음을 싼 길로 푸는 새 계획을 적는다(계획의 data.어디서 에 그 물음 열쇠 · 앞 세 계획(${막힘.계획들.join(' · ')}) 말고)` };
  }
  if (!놀이 && 늚재기(자료, 줄들, [...기록들].reverse().find((r) => r.값기록 !== undefined)?.이름 ?? null) >= 안늚상한) {
    // 맵을 다 알기 전에는 안 끝낸다 — 게임플레이가 그 맵을 쓴다
    const 빈 = 맵빈곳(줄들);
    if (빈.length > 0) return { 막음: `${안늚상한}번 해 보는 동안 지도가 안 늘었다 — 맵을 다 안 채운 곳이 있어 배우기를 못 끝낸다: ${빈.join(' · ')}. 그 곳 STAGE 의 data.맵 ${맵종류.length}종류를 먼저 채운다(지침 「맵 파악」)` };
    새로쓰기(join(자료, 게임자리.그만), `${안늚상한}번 해 보는 동안 확인 줄 · 가 본 곳 · 나아감이 안 늘었다`);
    return { 막음: `${안늚상한}번 해 보는 동안 지도가 안 늘었다 — 배우기를 끝낸다. 쪽지를 고쳐 쓰고 「학습 끝」 한 줄만 쓰고 끝낸다` };
  }
  // 결과를 오브젝트 값으로 읽는 곳이면 2초 기록에 같이 남긴다 — 판이 끝난 순간 깸 · 짐을 그 값으로 가른다
  const 결 = 계획.곳 === undefined ? null : 결과읽기(칸(찾기(계획.곳)));
  const 결과볼: 볼값[] = 결 === null || typeof 결 === 'string' || 결.칸 === undefined ? [] : [{ 이름: 결과이름, 주소: 결.주소, 칸: 결.칸 }];
  const 계산 = 계산찍기(계획.쓸것 ?? [], 줄들);
  return { 계획: 계획열쇠, 볼값: [...계획.볼값, 나, ...결과볼], 기대: 계획.기대, ...(계획.곳 === undefined ? {} : { 곳: 계획.곳 }), ...(Object.keys(계산).length === 0 ? {} : { 계산 }) };
}
