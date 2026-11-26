// 게임 배우기의 검사 — 계획 · 회고 · 「확인」 줄을 AI 가 옮겨 적은 글이 아니라 판 기록 파일의 값으로 대 본다 (도메인/게임 §3.10 「게임 배우기」 「지도 검증」 · 「회고」)
// 2026-11-26 다섯 번째 실측 — 본 값은 맞았는데 본 것보다 크게 말한 「확인」 줄(진 판이라 최고 기록이 안 남는다 · 네 항 합)이 올라갔다
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { 게임자리 } from './authoring-game.js';

/** 해 보는 동안 2초마다 읽는 값 — 칸이 있으면 오브젝트 값(`get`), 없으면 그 자리의 화면 글자(`text`). 화면은 같은 값을 보여 주는 글자 자리 */
export interface 볼값 { 이름: string; 주소: string; 칸?: string; 화면?: string }
export type 비교 = '>=' | '<=' | '==' | '>' | '<';
/** 잘되고 있으면 이 값이 이렇다 — 부터 · 까지는 다른 볼값이 그 수 이상 · 이하일 때만 본다(「1웨이브 끝까지 세계수 50 이상」) */
export interface 기대 { 값: string; 비교: 비교; 기준: number; 부터?: { 값: string; 기준: number }; 까지?: { 값: string; 기준: number } }
export interface 계획 { 볼값: 볼값[]; 기대: 기대[]; 목표: { 값: string; 기준: number } }

/** 게임마다 하나 — 얼마나 나아갔나를 보여 주는 값(깬 맵 수 · 레벨 · 해금 수). 해 볼 때마다 이 이름으로 같이 읽는다 */
export const 나아감열쇠 = 'goal:나아감';
export const 나아감 = '나아감';
export const 회고머리 = 'play:';
const 기록이름꼴 = /^\d{17}-[^/\\]+$/;
export const 까닭들 = ['손', '믿은것', '몰랐던것', '됨'] as const;
const 비교들: readonly string[] = ['>=', '<=', '==', '>', '<'];
const 볼값상한 = 10;

const 객체 = (v: unknown): Record<string, unknown> => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const 글인가 = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';
const 수인가 = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
/** 화면 글자의 서식 태그를 뗀다 — WaveText 는 `<font-weight="600">2/6</font-weight>` 라 태그를 두면 600 을 읽었다(#16052) */
const 태그뺌 = (글: string): string => 글.replace(/<[^>]*>/g, '');

/** 값을 수로 — 글이면 처음 나오는 수(「6/6」 → 6 · 「웨이브 3」 → 3). ponytail: 첫 수만 본다, 「남은 3 / 6」 처럼 둘째 수가 뜻이면 칸을 읽는다 */
export function 수로(v: unknown): number | null {
  if (수인가(v)) return v;
  if (typeof v !== 'string') return null;
  const m = /-?\d+(?:\.\d+)?/.exec(태그뺌(v).replace(/,/g, ''));
  return m === null ? null : Number(m[0]);
}

const 자리꼴 = (v: unknown): v is { 주소: string; 칸?: string } => 글인가(객체(v).주소) && (객체(v).칸 === undefined || 글인가(객체(v).칸));

/** 나아감 줄의 읽을 자리 — 없으면 null */
export function 나아감자리(data: unknown): 볼값 | null {
  return 자리꼴(data) ? { 이름: 나아감, 주소: data.주소, ...(data.칸 === undefined ? {} : { 칸: data.칸 }) } : null;
}

/** 계획(TRIAL) 줄의 data 에서 읽을 값 · 기대 · 목표 — 틀리면 까닭 글 */
export function 계획읽기(data: unknown): 계획 | string {
  const d = 객체(data);
  const 볼 = d.볼값;
  if (!Array.isArray(볼) || 볼.length === 0 || 볼.length > 볼값상한) return `data.볼값 에 읽을 값 1~${볼값상한}개를 [{ 이름, 주소, 칸?, 화면? }] 로 적는다`;
  const 이름들 = new Set<string>([나아감]);
  for (const b of 볼) {
    const x = 객체(b);
    if (!글인가(x.이름) || !자리꼴(b) || (x.화면 !== undefined && !글인가(x.화면))) return 'data.볼값 은 [{ 이름, 주소, 칸?, 화면? }] 이다 — 칸이 있으면 오브젝트 값, 없으면 그 자리의 화면 글자를 읽는다';
    if (이름들.has(x.이름)) return `data.볼값 이름 「${x.이름}」 이 겹친다(「${나아감}」 은 에이전트가 쓴다)`;
    이름들.add(x.이름);
  }
  const 있나 = (이름: unknown): boolean => typeof 이름 === 'string' && 이름들.has(이름);
  const 문 = (g: unknown): boolean => g === undefined || (있나(객체(g).값) && 수인가(객체(g).기준));
  const 기대들 = d.기대;
  if (!Array.isArray(기대들) || 기대들.length === 0 || 기대들.length > 볼값상한) return 'data.기대 에 「잘되고 있으면 이 값이 이렇다」를 [{ 값, 비교, 기준, 부터?, 까지? }] 로 하나 이상 적는다 — 숫자로 못 적는 계획은 무엇이 어긋났는지 못 따진다';
  for (const g of 기대들) {
    const x = 객체(g);
    if (!있나(x.값) || !비교들.includes(String(x.비교)) || !수인가(x.기준) || !문(x.부터) || !문(x.까지)) return `data.기대 는 [{ 값: <볼값 이름>, 비교: ${비교들.join(' | ')}, 기준: <수>, 부터?: { 값, 기준 }, 까지?: { 값, 기준 } }] 이다`;
  }
  const 목표 = 객체(d.목표);
  if (!있나(목표.값) || !수인가(목표.기준)) return 'data.목표 에 이번에 닿으려는 수를 { 값: <볼값 이름>, 기준: <수> } 로 적는다';
  return { 볼값: 볼 as 볼값[], 기대: 기대들 as 기대[], 목표: { 값: 목표.값 as string, 기준: 목표.기준 as number } };
}

const 견줌 = (a: number, 비: 비교, b: number): boolean => (비 === '>=' ? a >= b : 비 === '<=' ? a <= b : 비 === '>' ? a > b : 비 === '<' ? a < b : a === b);

/** 이 때의 값들에서 처음 어긋난 기대 — 문이 안 열렸거나 값을 못 읽었으면 안 본다 */
export function 어긋난기대(기대들: readonly 기대[], 값: Readonly<Record<string, number | null>>): 기대 | null {
  const 열림 = (g: 기대): boolean => {
    const 부터 = g.부터 === undefined ? true : (값[g.부터.값] ?? null) !== null && 값[g.부터.값]! >= g.부터.기준;
    const 까지 = g.까지 === undefined ? true : (값[g.까지.값] ?? null) !== null && 값[g.까지.값]! <= g.까지.기준;
    return 부터 && 까지;
  };
  return 기대들.find((g) => 열림(g) && (값[g.값] ?? null) !== null && !견줌(값[g.값]!, g.비교, g.기준)) ?? null;
}

export const 기대글 = (g: 기대): string => `${g.값} ${g.비교} ${g.기준}${g.부터 === undefined ? '' : ` (${g.부터.값} ${g.부터.기준} 부터)`}${g.까지 === undefined ? '' : ` (${g.까지.값} ${g.까지.기준} 까지)`}`;

/** 판 기록 json 가운데 이 검사가 읽는 칸 */
export interface 값때 { 초: number; 값: Record<string, number | null>; 화면?: Record<string, number | null> }
export interface 어긋남 { 초: number; 값이름: string; 값: number; 기대: string; 사진?: string }
export interface 값기록 { 계획: string; 볼값: 볼값[]; 간격ms: number; 때: 값때[]; 어긋남: 어긋남 | null; 화면다름: string[] }
export interface 끝글줄 { 주소: string; 경로: string; 글: string }
export interface 판기록 { 이름: string; 값?: unknown; 값기록?: 값기록; 끝글?: 끝글줄[] }

/** 자료 폴더의 판 기록 — 지켜보기 · 새것 글은 뺀다. 이름순이 시간순이다 */
export function 판기록들(자료: string): 판기록[] {
  const 폴더 = join(자료, 게임자리.조작기록);
  let 이름들: string[];
  try {
    이름들 = readdirSync(폴더).filter((x) => x.endsWith('.json') && 기록이름꼴.test(x.slice(0, -5)) && !/^\d{17}-지켜보기/.test(x)).sort();
  } catch {
    return [];
  }
  return 이름들.flatMap((x) => {
    try {
      const 몸 = 객체(JSON.parse(readFileSync(join(폴더, x), 'utf8')));
      return [{ 이름: x.slice(0, -5), 값: 몸.값, ...(몸.값기록 === undefined ? {} : { 값기록: 몸.값기록 as 값기록 }), ...(Array.isArray(몸.끝글) ? { 끝글: 몸.끝글 as 끝글줄[] } : {}) }];
    } catch {
      return [];
    }
  });
}

/** 「확인」 줄이 가리키는 값 자리 — 오브젝트 값(주소 · 칸)은 2초 기록에서, 화면 글자(주소)는 끝 화면 글에서, 돌려준 값은 함수가 돌려준 값에서 */
export type 값자리 = { 주소: string; 칸?: string } | { 돌려준: string };

export function 값찾기(기록: 판기록, 자리: 값자리): unknown {
  if ('돌려준' in 자리) return 자리.돌려준.split('.').reduce<unknown>((v, k) => 객체(v)[k], 기록.값);
  // 칸이 없으면 화면 글자다 — 2초 기록(수로 바꾼 값 · 끝보다 최대 2초 앞)이 아니라 끝 화면 글자 그대로 본다
  if (자리.칸 === undefined) return 기록.끝글?.find((e) => e.주소 === 자리.주소 || e.경로 === 자리.주소)?.글;
  const 기 = 기록.값기록;
  const 볼 = 기?.볼값.find((b) => b.주소 === 자리.주소 && b.칸 === 자리.칸);
  if (기 === undefined || 볼 === undefined) return undefined;
  for (let i = 기.때.length - 1; i >= 0; i -= 1) if ((기.때[i]!.값[볼.이름] ?? null) !== null) return 기.때[i]!.값[볼.이름];
  return undefined;
}

const 자리읽기 = (v: unknown): 값자리 | null => (글인가(객체(v).돌려준) ? { 돌려준: 객체(v).돌려준 as string } : 자리꼴(v) ? { 주소: v.주소, ...(v.칸 === undefined ? {} : { 칸: v.칸 }) } : null);
const 자리글 = (z: 값자리): string => ('돌려준' in z ? `돌려준 ${z.돌려준}` : `${z.주소}${z.칸 === undefined ? '' : ` ${z.칸}`}`);
type 기대값 = string | number | { 아님: string | number };
const 기대값인가 = (v: unknown): v is 기대값 => typeof v === 'string' || 수인가(v) || (객체(v).아님 !== undefined && (typeof 객체(v).아님 === 'string' || 수인가(객체(v).아님)));
const 같나 = (본: unknown, 적은: string | number): boolean => (typeof 적은 === 'number' ? 수로(본) === 적은 : 태그뺌(String(본)).trim() === 적은.trim());
const 맞나 = (본: unknown, 적은: 기대값): boolean => (typeof 적은 === 'object' ? !같나(본, 적은.아님) : 같나(본, 적은));
const 값글 = (v: 기대값): string => (typeof v === 'object' ? `${JSON.stringify(v.아님)} 아님` : JSON.stringify(v));

const 대봄꼴 = 'data.대봄 은 { 값: <자리>, 조건?: <자리>, 기대: [{ 조건값?, 값 }] } 이나 { 셈: { 항: [<자리>…], 합: <자리> } } 이다(자리는 { 주소, 칸? } · { 돌려준: "<점 경로>" }, 값에 { 아님: x } 도 된다)';

/**
 * 「확인」 줄 검사 — 줄이 고른 판이 아니라 자료 폴더의 판 기록 전부에서 값을 직접 읽는다. 걸리는 까닭들(빈 목록이면 통과).
 * 조건을 적으면 조건값마다 기록이 있어야 하고 값이 갈려야 한다 · 조건이 없으면 「늘 이 값」 · 셈은 항마다 0 아닌 판이 있어야 한다
 */
export function 대봄검사(data: unknown, 기록들: readonly 판기록[]): string[] {
  const 대 = 객체(객체(data).대봄);
  if (Object.keys(대).length === 0) return [`확인은 판 기록으로 대 볼 수 있어야 한다 — ${대봄꼴}`];
  if (대.셈 !== undefined) {
    const 셈 = 객체(대.셈);
    const 항 = Array.isArray(셈.항) ? 셈.항.map(자리읽기) : [];
    const 합 = 자리읽기(셈.합);
    if (항.length < 2 || 항.some((x) => x === null) || 합 === null) return [대봄꼴];
    const 판들 = 기록들.flatMap((r) => {
      const 수들 = 항.map((z) => 수로(값찾기(r, z!)));
      const 합수 = 수로(값찾기(r, 합));
      return 수들.every((n) => n !== null) && 합수 !== null ? [{ 이름: r.이름, 수들: 수들 as number[], 합수 }] : [];
    });
    if (판들.length === 0) return [`셈의 항 · 합이 다 든 판 기록이 없다(${자리글(합)})`];
    return [
      ...판들.filter((p) => p.수들.reduce((a, b) => a + b, 0) !== p.합수).map((p) => `${p.이름} 에서 항의 합 ${p.수들.join('+')} 이 ${p.합수} 와 다르다`),
      ...항.flatMap((z, i) => (판들.some((p) => p.수들[i] !== 0) ? [] : [`항 ${자리글(z!)} 이 0 아닌 판이 없다 — 더해진 적이 없는 항이다`])),
    ];
  }
  const 값 = 자리읽기(대.값);
  const 조건 = 대.조건 === undefined ? null : 자리읽기(대.조건);
  const 기대들 = Array.isArray(대.기대) ? 대.기대.map(객체) : [];
  if (값 === null || (대.조건 !== undefined && 조건 === null) || 기대들.length === 0 || 기대들.some((g) => !기대값인가(g.값) || (조건 !== null && !(typeof g.조건값 === 'string' || 수인가(g.조건값))))) return [대봄꼴];
  if (조건 === null) {
    if (기대들.length !== 1) return ['조건이 없으면 기대는 하나다(늘 이 값)'];
    const 든 = 기록들.filter((r) => 값찾기(r, 값) !== undefined);
    if (든.length < 2) return [`${자리글(값)} 값이 든 판 기록이 ${든.length}개다 — 둘은 있어야 「늘」이라 한다`];
    return 든.filter((r) => !맞나(값찾기(r, 값), 기대들[0]!.값 as 기대값)).map((r) => `${r.이름} 에서 ${자리글(값)} 이 ${JSON.stringify(값찾기(r, 값))} 이다(적은 것 ${값글(기대들[0]!.값 as 기대값)})`);
  }
  if (기대들.length < 2) return ['조건을 적으면 조건값을 둘 이상 적는다 — 다른 조건에서 값이 달라야 그 조건이 까닭이다'];
  const 걸림: string[] = [];
  for (const g of 기대들) {
    const 든 = 기록들.filter((r) => 값찾기(r, 값) !== undefined && 값찾기(r, 조건) !== undefined && 같나(값찾기(r, 조건), g.조건값 as string | number));
    if (든.length === 0) 걸림.push(`${자리글(조건)} 이 ${JSON.stringify(g.조건값)} 인 판 기록이 없다 — 그 조건으로 해 보기 전에는 덜 봄이다`);
    for (const r of 든) if (!맞나(값찾기(r, 값), g.값 as 기대값)) 걸림.push(`${r.이름} 에서 ${자리글(조건)} ${JSON.stringify(g.조건값)} 인데 ${자리글(값)} 이 ${JSON.stringify(값찾기(r, 값))} 이다(적은 것 ${값글(g.값 as 기대값)})`);
  }
  const 값들 = 기대들.map((g) => JSON.stringify(g.값));
  if (기대들.every((g) => typeof g.값 !== 'object') && new Set(값들).size === 1) 걸림.push('조건이 달라도 적은 값이 같다 — 그 조건은 까닭이 아니다');
  return 걸림;
}

/** 회고 줄 열쇠의 판 기록 이름 — 쪽지 같은 다른 PLAY 줄이면 null */
export const 회고기록이름 = (열쇠: string): string | null => (열쇠.startsWith(회고머리) && 기록이름꼴.test(열쇠.slice(회고머리.length)) ? 열쇠.slice(회고머리.length) : null);

/** 그 볼값이 해 보는 동안 닿은 가장 큰 수 */
export const 가장큰 = (기: 값기록, 이름: string): number | null => 기.때.reduce<number | null>((m, t) => ((t.값[이름] ?? null) === null ? m : m === null ? t.값[이름]! : Math.max(m, t.값[이름]!)), null);
