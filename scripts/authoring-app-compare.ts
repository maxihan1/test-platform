// 앱 기획서 맞대기 — 표준 기획서 항목마다 배운 것과 견준 갈래 표(app-compare.json) 검사(장치 ③) · 시작 표시 · 해 본 기록 고르기 (도메인/작성 §3.6 「★ 앱 배우기」 「기획서 맞대기」 · APP-F5-04)
// 쓰는 법(자식이 기획서 맞대기를 끝내기 전에 스스로 검사): npx tsx scripts/authoring-app-compare.ts <자료 폴더> <접두사> — 0 지남 · 1 고칠 것 있음 · 2 부를 수 없음
// 에이전트의 앱 탐색 체크포인트가 같은 손으로 다시 본다. 폰 없이 파일만 읽는다
import { existsSync, lstatSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import type { PrdItem } from '@platform/kit/types';

import { 본문상한 } from '../apps/admin/src/prd/rules.js';
import { type 앱배운줄, type 적은앱줄, 배운것올리기, 배움상한, 앱배움자리, 적은줄들, 지금배운것, 지금빌드 } from './authoring-app-learned.js';
import { 자름 } from './authoring-learn-map.js';
import { type 옮긴항목, 옮긴것읽기 } from './authoring-prd.js';
import { type 화면통로, 새로쓰기, 안전히읽기 } from './authoring-screens-keep-io.js';

export const 앱맞대기자리 = { 표: 'app-compare.json', 시작: 'app-compare.start', 케이스시작: 'app-cases.start' } as const;

/** 요구가 될 수 있는 종류 — 이 종류의 확인 줄은 다 표에 들어야 한다. ASK · ODD · NOTE 는 테스터 줄이다 */
const 요구종류 = new Set(['SCREEN', 'RULE', 'INPUT', 'STATE', 'FLOW', 'ROLE', 'SIGNAL']);
const 갈래들 = ['같음', '다름', '기획서에만'] as const;
/** 해 본 기록 없이 진행 불가 · 보류가 되는 환경 까닭 — 닫힌 머리 목록이다. 「계정 레벨이 오르는 조건」 같은 앱 규칙이 빠지지 않게 머리로만 본다 */
export const 환경까닭 = /^(?:폰을 못 잡음|앱 서버에 못 닿음|테스트 계정 없음|두 번째 계정 없음|일회용 계정 없음|다른 앱 결제|다른 앱 로그인)/;
export const 기록꼴 = /\d{17}-[\p{L}\p{N}_-]{1,60}\.json/gu;
// 까닭에서 뽑는 꼴과 같아야 센 기록을 댈 수 있다
const 기록이름꼴 = /^\d{17}-[\p{L}\p{N}_-]{1,60}\.json$/u;

/** 까닭 — 「기획서에만」을 해 볼 수 없는 환경(앱 서버에 못 닿음 등)일 때만 쓴다 */
export interface 맞대기항목 { 요구: string; 갈래: (typeof 갈래들)[number]; 배운줄: string[]; 해본것: string[]; 까닭?: string }
export interface 앱에만줄 { 배운줄: string; 요구?: string; 안옮김?: string }
export interface 맞대기표 { 항목: 맞대기항목[]; 앱에만: 앱에만줄[] }
/** 에이전트가 시작 표시에 적는 이번 범위 — 이어 작성 · 반영은 맡은 요구만, 화면만은 이번 결과 항목만 본다 */
export interface 맞대기범위 { 맡은요구?: string[]; 화면만?: boolean }

const 글인가 = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';
const 글목록인가 = (v: unknown): v is string[] => Array.isArray(v) && v.every(글인가);
const JSON읽기 = (자리: string, 이름: string, 상한: number): unknown => {
  try {
    return JSON.parse(안전히읽기(자리, 이름, 상한) ?? 'null') as unknown;
  } catch {
    return null;
  }
};

/** 표를 읽는다. 없거나 꼴이 틀리면 까닭 글 */
export function 맞대기표읽기(글: string | null): 맞대기표 | string {
  const 이름 = 앱맞대기자리.표;
  if (글 === null) return `${이름} 이 없거나 1MB 를 넘는다 — 표준 기획서 항목마다 갈래를 적는다`;
  let 몸: { 항목?: unknown; 앱에만?: unknown } | null;
  try {
    몸 = JSON.parse(글) as typeof 몸;
  } catch {
    return `${이름} 을 JSON 으로 못 읽었다`;
  }
  if (!Array.isArray(몸?.항목) || (몸.앱에만 !== undefined && !Array.isArray(몸.앱에만))) return `${이름} 에 「항목」 배열이 없다`;
  const 항목: 맞대기항목[] = [];
  for (const [i, x] of (몸.항목 as Record<string, unknown>[]).entries()) {
    if (!글인가(x?.요구) || !(갈래들 as readonly unknown[]).includes(x.갈래) || (x.배운줄 !== undefined && !글목록인가(x.배운줄)) || (x.해본것 !== undefined && !글목록인가(x.해본것)) || (x.까닭 !== undefined && !글인가(x.까닭))) {
      return `${이름} 항목 ${String(i + 1)} 의 꼴이 틀렸다 — 요구 · 갈래(「같음」 · 「다름」 · 「기획서에만」) · 배운줄(열쇠 배열) · 해본것(기록 이름 배열)`;
    }
    항목.push({ 요구: x.요구, 갈래: x.갈래 as 맞대기항목['갈래'], 배운줄: (x.배운줄 as string[] | undefined) ?? [], 해본것: (x.해본것 as string[] | undefined) ?? [], ...(x.까닭 === undefined ? {} : { 까닭: x.까닭 as string }) });
  }
  const 앱에만: 앱에만줄[] = [];
  for (const [i, x] of ((몸.앱에만 ?? []) as Record<string, unknown>[]).entries()) {
    if (!글인가(x?.배운줄) || (x.요구 !== undefined && !글인가(x.요구)) || (x.안옮김 !== undefined && !글인가(x.안옮김))) {
      return `${이름} 앱에만 ${String(i + 1)} 의 꼴이 틀렸다 — 배운줄(열쇠) · 요구(더한 항목 번호) 또는 안옮김(까닭)`;
    }
    앱에만.push({ 배운줄: x.배운줄, ...(x.요구 === undefined ? {} : { 요구: x.요구 as string }), ...(x.안옮김 === undefined ? {} : { 안옮김: x.안옮김 as string }) });
  }
  return { 항목, 앱에만 };
}

/** 시작 표시 — 이미 있으면 그대로 둔다(이어받은 실행이 앞 세션의 해 본 기록을 잃지 않게). 범위는 기획서 맞대기 표시에만 적는다 */
export function 시작적기(자료: string, 이름: string, 범위: 맞대기범위 = {}): void {
  if (!existsSync(join(자료, 이름))) 새로쓰기(join(자료, 이름), JSON.stringify(범위));
}

/** 에이전트가 세션을 띄우기 직전에 — 기획서 맞대기 표시는 늘, 케이스 표시는 케이스를 쓰는 세션(끝 갈래 · 한 세션뿐인 작성) 앞에 */
export function 앱시작적기(자료: string, 탐색: { 까지: true } | { 끝: string } | undefined, 범위: 맞대기범위): void {
  시작적기(자료, 앱맞대기자리.시작, 범위);
  if (탐색 === undefined || '끝' in 탐색) 시작적기(자료, 앱맞대기자리.케이스시작);
}

export function 범위읽기(자료: string): 맞대기범위 {
  const 몸 = JSON읽기(자료, 앱맞대기자리.시작, 100_000) as 맞대기범위 | null;
  return { ...(글목록인가(몸?.맡은요구) ? { 맡은요구: 몸.맡은요구 } : {}), ...(몸?.화면만 === true ? { 화면만: true } : {}) };
}

/**
 * 시작 표시보다 늦게 바뀐 해 본 기록 이름 — 화면 읽기만 한 「본 기록」(해봄 false)은 안 센다. 표시가 없으면 다 받는다.
 * 배우기 때 남긴 기록이 기획서 맞대기 · 케이스의 근거가 되지 않게 표시로 가른다
 */
export function 이번기록들(자료: string, 표시: string): Set<string> {
  const 정보 = lstatSync(join(자료, 표시), { throwIfNoEntry: false });
  const 뒤 = 정보?.isFile() === true ? 정보.mtimeMs : 0;
  const 폴더 = join(자료, 앱배움자리.기록);
  let 이름들: string[];
  try {
    이름들 = readdirSync(폴더);
  } catch {
    return new Set();
  }
  return new Set(이름들.filter((x) => {
    if (!기록이름꼴.test(x)) return false;
    const f = lstatSync(join(폴더, x), { throwIfNoEntry: false });
    return f?.isFile() === true && f.mtimeMs >= 뒤 && (JSON읽기(폴더, x, 1024 * 1024) as { 해봄?: unknown } | null)?.해봄 === true;
  }));
}

/** 까닭이 대는 이번 기록 — `해 본 것:` 뒤의 기록 이름 가운데 이번 기록인 것 */
export const 댄기록 = (까닭: string, 이번: ReadonlySet<string>): string[] =>
  /해 본 것:/.test(까닭) ? [...new Set([...까닭.matchAll(기록꼴)].map((m) => m[0]).filter((x) => 이번.has(x)))] : [];

/** 확인 줄 — 확인 믿음이고 지금 빌드에서 본 줄(지금 빌드를 모르면 빌드로 가르지 않는다). 다른 빌드의 확인 줄은 다시 볼 것이다 */
const 확인줄인가 = (x: 앱배운줄, 빌드: string | undefined): boolean => x.learned.belief === 'CONFIRMED' && (빌드 === undefined || x.learned.build === 빌드);
const 칸 = (x: 앱배운줄): Record<string, unknown> => (typeof x.learned.data === 'object' && x.learned.data !== null && !Array.isArray(x.learned.data) ? (x.learned.data as Record<string, unknown>) : {});

export interface 맞대기재료 {
  표: 맞대기표;
  줄들: readonly 앱배운줄[];
  빌드?: string;
  /** 이번 결과(out/prd.json) 항목 — 없으면 null */
  결과: readonly 옮긴항목[] | null;
  지금판: readonly PrdItem[];
  /** 기획서 맞대기 시작 뒤의 해 본 기록 */
  이번: ReadonlySet<string>;
  범위: 맞대기범위;
}

/** 갈래를 적어야 하는 항목 번호 — 이어 작성 · 반영은 맡은 요구, 이번 결과가 있으면 그 항목, 없으면 현재 버전(화면만은 이번 결과뿐이다) */
function 볼항목(r: 맞대기재료, 모두: ReadonlyMap<string, 옮긴항목>): string[] {
  if (r.범위.맡은요구 !== undefined) return r.범위.맡은요구.filter((n) => 모두.has(n));
  if (r.결과 !== null) return r.결과.flatMap((i) => [i.reqId ?? i.임시].filter(글인가));
  return r.범위.화면만 === true ? [] : r.지금판.map((i) => i.reqId);
}

/** 아직 표에도 PRD 에도 안 이은 요구 종류 확인 줄 — 앞 작성이 이은 줄(data.요구 가 현재 버전에 있다) · 안 옮기기로 한 줄은 뺀다 */
export function 빠진줄들(r: 맞대기재료): 앱배운줄[] {
  if (r.범위.맡은요구 !== undefined) return [];
  const 있는번호 = new Set(r.지금판.map((i) => i.reqId));
  const 든 = new Set([...r.표.항목.flatMap((x) => x.배운줄), ...r.표.앱에만.map((x) => x.배운줄)]);
  return r.줄들.filter((x) => 요구종류.has(x.kind) && 확인줄인가(x, r.빌드) && !든.has(x.key) && !글인가(칸(x).안옮김) &&
    ![칸(x).요구].flat().some((n) => typeof n === 'string' && 있는번호.has(n)));
}

/** 장치 ③ — 표 빈칸 · 틀린 근거. 비면 지났다 */
export function 맞대기검사(r: 맞대기재료): string[] {
  const 모두 = new Map<string, 옮긴항목>([...r.지금판.map((i) => [i.reqId, i] as const), ...(r.결과 ?? []).flatMap((i) => [i.reqId, i.임시].filter(글인가).map((n) => [n, i] as const))]);
  const 줄 = new Map(r.줄들.map((x) => [x.key, x]));
  const 틀림: string[] = [];
  const 확인줄틀림 = (열쇠: string, 자리: string): string[] => {
    const x = 줄.get(열쇠);
    if (x === undefined) return [`${자리} — 배운 것에 없는 열쇠다(${열쇠})`];
    return 확인줄인가(x, r.빌드) ? [] : [`${자리} — ${열쇠} 는 확인 줄이 아니다(${x.learned.belief ?? '믿음 없음'}${x.learned.build === r.빌드 || r.빌드 === undefined ? '' : ` · 빌드 ${x.learned.build ?? '없음'}`}) — 확인까지 올리거나 「기획서에만」으로 간다`];
  };
  const 갈래수 = new Map<string, number>();
  for (const n of [...r.표.항목.map((x) => x.요구), ...r.표.앱에만.flatMap((x) => [x.요구].filter(글인가))]) 갈래수.set(n, (갈래수.get(n) ?? 0) + 1);
  for (const n of 볼항목(r, 모두)) {
    const 수 = 갈래수.get(n) ?? 0;
    if (수 === 0) 틀림.push(`${n} — 갈래가 없다(같음 · 다름 · 기획서에만, 앱에만으로 더한 항목이면 앱에만 줄의 요구)`);
    else if (수 > 1) 틀림.push(`${n} — 갈래가 ${String(수)}개다 — 하나만 적는다`);
  }
  for (const x of r.표.항목) {
    const 자리 = `${x.요구}(${x.갈래})`;
    const 항목 = 모두.get(x.요구);
    if (항목 === undefined) {
      틀림.push(`${자리} — 표준 기획서에 없는 번호다`);
      continue;
    }
    if (x.갈래 === '기획서에만') {
      if (x.까닭 !== undefined && 환경까닭.test(x.까닭)) continue;
      const 댄 = x.해본것.filter((n) => r.이번.has(n));
      if (댄.length === 0) 틀림.push(`${자리} — 기획서 맞대기 시작 뒤의 해 본 기록을 안 댔다 — 폰에서 그 기능을 찾아 해 본 기록 명령으로 해 보고 그 이름을 「해본것」에 적는다${x.해본것.length > 0 ? `(댄 ${x.해본것.slice(0, 3).join(' · ')} 은 이번 기록이 아니거나 화면 읽기만 한 기록이다)` : ''}`);
      continue;
    }
    if (x.배운줄.length === 0) 틀림.push(`${자리} — 배운 확인 줄 열쇠를 안 댔다`);
    for (const 열쇠 of x.배운줄) 틀림.push(...확인줄틀림(열쇠, 자리));
    if (x.갈래 === '다름' && 항목.status === 'NEEDS_CHECK' && 항목.observed === undefined) 틀림.push(`${자리} — 확인 필요 항목인데 배운 값을 현재 동작(observed · where APP_EXPLORE)으로 안 달았다`);
  }
  for (const x of r.표.앱에만) {
    const 자리 = `앱에만 ${x.배운줄}`;
    틀림.push(...확인줄틀림(x.배운줄, 자리));
    if (r.범위.맡은요구 !== undefined && x.요구 !== undefined) 틀림.push(`${자리} — 이어 작성 · 반영은 앱에만을 표준 기획서에 더하지 않는다 — 다음 새 작성 · 대조 때 올라간다`);
    if (x.요구 === undefined) {
      if (x.안옮김 === undefined) 틀림.push(`${자리} — 더한 항목 번호(요구)나 안 옮긴 까닭(안옮김)이 없다`);
      continue;
    }
    const 항목 = 모두.get(x.요구);
    if (항목 === undefined) 틀림.push(`${자리} — 표준 기획서에 없는 번호다(${x.요구})`);
    else if (항목.status !== 'NEEDS_CHECK' || !항목.basis.some((b) => b.from === '화면')) 틀림.push(`${자리} — ${x.요구} 는 근거 「화면」을 단 확인 필요 항목이어야 한다(배운 줄의 화면 키와 문장)`);
  }
  const 빠짐 = 빠진줄들(r);
  if (빠짐.length > 0) 틀림.push(`요구가 될 수 있는 확인 줄 ${String(빠짐.length)}개가 표에 없다 — 같음 · 다름의 배운줄이나 앱에만으로 적는다: ${빠짐.slice(0, 10).map((x) => x.key).join(' · ')}${빠짐.length > 10 ? ` 외 ${String(빠짐.length - 10)}개` : ''}`);
  return 틀림;
}

/** 자료 폴더를 읽어 재료를 모은다 — 표가 없거나 틀리면 그 까닭 */
export function 맞대기재료읽기(자료: string, 접두사: string, 없으면빈표 = false): 맞대기재료 | string {
  const 글 = 안전히읽기(자료, 앱맞대기자리.표, 1_000_000);
  const 표 = 글 === null && 없으면빈표 && !existsSync(join(자료, 앱맞대기자리.표)) ? { 항목: [], 앱에만: [] } : 맞대기표읽기(글);
  if (typeof 표 === 'string') return 표;
  const 몸 = JSON읽기(join(자료, 'out'), 'prd.json', 본문상한);
  const 옮긴 = 몸 === null ? null : 옮긴것읽기(몸, 접두사);
  const 판 = (JSON읽기(자료, 'prd-current.json', 본문상한 * 2) as { items?: unknown } | null)?.items;
  const 빌드 = 지금빌드(자료);
  return {
    표, 줄들: 지금배운것(자료), ...(빌드 === undefined ? {} : { 빌드 }), 결과: 옮긴 !== null && 'items' in 옮긴 ? 옮긴.items : null,
    지금판: Array.isArray(판) ? (판 as PrdItem[]) : [], 이번: 이번기록들(자료, 앱맞대기자리.시작), 범위: 범위읽기(자료),
  };
}

/** 체크포인트가 부르는 손 — 못 지난 까닭들 */
export function 맞대기못지남(자료: string, 접두사: string): string[] {
  const r = 맞대기재료읽기(자료, 접두사);
  return typeof r === 'string' ? [r] : 맞대기검사(r).map((s) => `기획서 맞대기 — ${s}`);
}

/** 화면만이 쓸 것이 하나도 없나 — 결과 파일이 없고 표에 넣을 확인 줄도 없다. 체크포인트로 막지 않고 「PRD 에 없는 화면 0」으로 닫는다 */
export function 앱쓸것없나(자료: string, 접두사: string): boolean {
  if (existsSync(join(자료, 'out', 'prd.json'))) return false;
  // 쓸 것이 없으면 표도 안 쓴다 — 표가 없으면 빈 표로 센다
  const r = 맞대기재료읽기(자료, 접두사, true);
  return typeof r !== 'string' && 빠진줄들(r).length === 0;
}

const 요구번호꼴 = /^[A-Z][A-Z0-9]*-REQ-\d{3}$/;

/**
 * 표준 기획서를 올린 뒤(임시 번호가 받은 번호로 바뀐 뒤) 「앱에만」 줄에 더한 번호(data.요구)나 안 옮긴 까닭(data.안옮김)을 달아 올린다 —
 * 안 달면 다음 작성의 맞대기가 같은 줄을 또 「표에 없다」고 짚는다. 같음 · 다름은 기획서 맞대기 세션이 이미 적었다. 이어 작성 · 반영은 앱에만을 안 올려 건너뛴다. PR 머리 줄
 */
export async function 앱번호달기(통로: 화면통로, 자료: string, 비밀: readonly string[]): Promise<string[]> {
  const 표 = 맞대기표읽기(안전히읽기(자료, 앱맞대기자리.표, 1_000_000));
  if (typeof 표 === 'string' || 범위읽기(자료).맡은요구 !== undefined) return [];
  const 줄 = new Map(지금배운것(자료).map((x) => [x.key, x]));
  const 행들: 적은앱줄[] = 표.앱에만.flatMap((e) => {
    const x = 줄.get(e.배운줄);
    const 번호 = e.요구 !== undefined && 요구번호꼴.test(e.요구) ? e.요구 : undefined;
    if (x === undefined || (번호 === undefined && e.안옮김 === undefined)) return [];
    const 앞 = 칸(x);
    const 요구 = [...new Set([앞.요구].flat().filter((n): n is string => typeof n === 'string').concat(번호 === undefined ? [] : [번호]))];
    const data = { ...앞, ...(요구.length > 0 ? { 요구 } : {}), ...(e.안옮김 === undefined ? {} : { 안옮김: e.안옮김.slice(0, 200) }) };
    return JSON.stringify(data) === JSON.stringify(앞) ? [] : [{ ...x, learned: { ...x.learned, data } }];
  });
  if (행들.length === 0) return [];
  // 아직 안 올린 줄이 있으면 같이 올린다 — 같은 열쇠는 이번 것이 이긴다
  const 남은 = 적은줄들(안전히읽기(자료, 앱배움자리.적은, 배움상한)).filter((e) => !행들.some((r) => r.key === e.key));
  새로쓰기(join(자료, 앱배움자리.적은), JSON.stringify({ rows: [...남은, ...행들] }));
  const 올림 = await 배운것올리기(통로, 자료, 비밀);
  return 올림.못올림.length > 0 ? 올림.못올림.map((왜) => `앱 배운 줄에 요구 번호: 못 달았음 — ${왜}`) : [`앱 배운 줄에 요구 번호: ${String(행들.length)}줄`];
}

export function 실행(인자: string[]): number {
  const [자료, 접두사] = 인자;
  if (자료 === undefined || 접두사 === undefined || 인자.length !== 2) {
    console.error('쓰는 법: npx tsx scripts/authoring-app-compare.ts <자료 폴더> <접두사>');
    return 2;
  }
  const r = 맞대기재료읽기(자료, 접두사);
  if (typeof r === 'string') {
    console.error(`[기획서 맞대기] ${r}`);
    return 1;
  }
  const 빠짐 = 빠진줄들(r);
  const 틀림 = 맞대기검사(r);
  console.log([
    `# 기획서 맞대기 — 항목 갈래 ${String(r.표.항목.length)} · 앱에만 ${String(r.표.앱에만.length)} · 표에 아직 없는 확인 줄 ${String(빠짐.length)} · 이번 해 본 기록 ${String(r.이번.size)}`,
    ...빠짐.slice(0, 30).map((x) => `- ${x.key} · ${x.kind}${x.screen === null ? '' : ` · ${x.screen}`} — ${자름(x.learned.text, 120)}`),
    ...(빠짐.length > 30 ? [`- … 외 ${String(빠짐.length - 30)}개(찾기 명령으로 본다)`] : []),
    ...틀림.map((s) => `고칠 것: ${s}`),
  ].join('\n'));
  return 틀림.length === 0 ? 0 : 1;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = 실행(process.argv.slice(2));
