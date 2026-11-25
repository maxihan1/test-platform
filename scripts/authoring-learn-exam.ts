// 게임 배우기의 시험 — 지도만 본 새 세션이 확인된 줄의 값을 먼저 적고 재서 맞힌다 (도메인/게임 §3.10 「게임 배우기」 시험). 시험감 고르기 · 채점은 에이전트가, 적기는 시험 자식이 부른다
// 쓰는 법(시험 자식 — 값은 표준 입력의 JSON): npx tsx scripts/authoring-learn-exam.ts <자료 폴더> 예측 | 결과 | 판 — 0 적음 · 1 안 받음 · 2 부를 수 없음
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { 게임자리, 요소상한 } from './authoring-game.js';
import { 정리알림 } from './authoring-game-find.js';
import { type 지도, 목록글, 자름 } from './authoring-learn-map.js';
import { 새로쓰기, 안전히읽기 } from './authoring-screens-keep-io.js';

/** 값을 맞혀 볼 종류 — 앞에 있을수록 승패에 가깝다 */
const 시험종류 = ['GOAL', 'RULE', 'CALC', 'MATCH', 'BEHAVIOR', 'STAGE', 'TIME', 'GROWTH', 'BOUND', 'MOVE', 'FLOW', 'STATE', 'INPUT', 'SAVE', 'MULTI'];
const 시험감수 = 8;
/** 값이 늘 같지 않은 꼴 — 한 번 빗나갔다고 내리지 않는다 */
const 랜덤꼴 = new Set(['RANGE', 'RATE', 'LIST', 'DEPENDS']);
const 랜덤틀림최소 = 3;

export interface 시험감 {
  열쇠: string;
  종류: string;
  이름: string;
  문장: string;
  랜덤: boolean;
  /** 배울 때 잰 것 — 시험은 여기 없는 조건으로 본다 */
  잰것: unknown;
}

/** 확인된 줄에서 종류를 돌아가며 고른다 — 한 종류(계산)만 시험하지 않게. 치트로 본 것은 뺀다 */
export function 시험감고르기(지금: 지도): 시험감[] {
  const 종류별 = 시험종류.map((k) => 지금.줄들.filter((x) => x.kind === k && x.learned?.belief === 'CONFIRMED' && x.learned.marks?.includes('CHEAT') !== true));
  const 차례 = Array.from({ length: Math.max(0, ...종류별.map((들) => 들.length)) }, (_, i) => 종류별.flatMap((들) => (들[i] === undefined ? [] : [들[i]]))).flat();
  return 차례.slice(0, 시험감수).map((x) => ({ 열쇠: x.key, 종류: x.kind, 이름: x.name, 문장: x.learned!.text, 랜덤: 랜덤꼴.has(x.learned!.shape ?? ''), 잰것: x.learned!.data ?? null }));
}

/** 값 하나 · 범위 · 나올 것 목록 가운데 하나 */
export type 예측 = { 값: unknown } | { 최소: number; 최대: number } | { 목록: unknown[] };
export interface 시험답 {
  예측: { 열쇠: string; 조건: string; 예측: 예측 }[];
  결과: { 열쇠: string; 잰값?: unknown[]; 못잼?: string }[];
  판?: { 끝: boolean; 이김?: boolean; 까닭?: string; 기록?: string };
}

const 같나 = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
export function 맞나(예측: 예측, 잰값: unknown): boolean {
  if ('값' in 예측) return 같나(예측.값, 잰값);
  if ('목록' in 예측) return 예측.목록.some((x) => 같나(x, 잰값));
  return typeof 잰값 === 'number' && 잰값 >= 예측.최소 && 잰값 <= 예측.최대;
}

export interface 채점 {
  맞음: string[];
  틀림: string[];
  /** 랜덤 줄이 몇 번 벗어났다 — 내리지 않고 표본에 더한다 */
  표본: string[];
  못잼: string[];
}

export function 채점하기(감들: readonly 시험감[], 답: 시험답): 채점 {
  const r: 채점 = { 맞음: [], 틀림: [], 표본: [], 못잼: [] };
  for (const 감 of 감들) {
    const 예측 = 답.예측.find((x) => x.열쇠 === 감.열쇠)?.예측;
    const 잰값 = 답.결과.find((x) => x.열쇠 === 감.열쇠)?.잰값 ?? [];
    if (예측 === undefined || 잰값.length === 0) {
      r.못잼.push(감.열쇠);
      continue;
    }
    const 벗어남 = 잰값.filter((v) => !맞나(예측, v)).length;
    if (벗어남 === 0) r.맞음.push(감.열쇠);
    else if (!감.랜덤 || (잰값.length >= 랜덤틀림최소 && 벗어남 === 잰값.length)) r.틀림.push(감.열쇠);
    else r.표본.push(감.열쇠);
  }
  return r;
}

const 글인가 = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';

/** 시험 성적 한 줄 — `판기록있나` 는 시험 자식이 적은 조작 기록 파일이 정말 있나 */
export function 시험줄(점: 채점, 답: 시험답, 판기록있나: boolean): string {
  const 판 = 답.판;
  const 판글 =
    판 === undefined ? '첫 판 안 해 봄'
    : !판.끝 ? `첫 판을 끝까지 못 감${글인가(판.까닭) ? `(${자름(판.까닭.replace(/\s+/g, ' ').trim(), 80)})` : ''}`
    : !판기록있나 ? '첫 판을 끝냈다고 했지만 조작 기록 없음'
    : `첫 판 끝까지 감${판.이김 === undefined ? '' : 판.이김 ? '(이김)' : '(짐)'}`;
  const 낱 = [`맞음 ${점.맞음.length}`, `틀림 ${점.틀림.length}`, ...(점.표본.length > 0 ? [`표본에 더함 ${점.표본.length}`] : []), ...(점.못잼.length > 0 ? [`못 잼 ${점.못잼.length}`] : [])].join(' · ');
  return `${판글} · 예측 ${점.맞음.length + 점.틀림.length + 점.표본.length + 점.못잼.length}개 — ${낱}${점.틀림.length === 0 ? '' : ` — 「확인」에서 내린 줄: ${목록글(점.틀림, 8)}`}`;
}

/** 시험 자식이 쓴 답 — 못 읽으면 빈 답이다(전부 못 잼이 된다) */
export function 시험답읽기(글: string | null): 시험답 {
  try {
    const 몸 = JSON.parse(글 ?? '{}') as Partial<시험답>;
    return { 예측: Array.isArray(몸.예측) ? 몸.예측 : [], 결과: Array.isArray(몸.결과) ? 몸.결과 : [], ...(typeof 몸.판 === 'object' && 몸.판 !== null ? { 판: 몸.판 } : {}) };
  } catch {
    return { 예측: [], 결과: [] };
  }
}

export function 시험감읽기(글: string | null): 시험감[] {
  try {
    const 몸 = JSON.parse(글 ?? '[]') as unknown;
    return Array.isArray(몸) ? (몸 as 시험감[]) : [];
  } catch {
    return [];
  }
}

const 수인가 = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const 예측인가 = (v: unknown): v is 예측 => {
  if (typeof v !== 'object' || v === null) return false;
  const x = v as Record<string, unknown>;
  return Object.hasOwn(x, '값') || (수인가(x.최소) && 수인가(x.최대) && x.최소 <= x.최대) || (Array.isArray(x.목록) && x.목록.length > 0);
};

/** 답 하나를 더한다. 예측은 재기 전에 한 번만 — 재고 나서 예측을 고치면 시험이 아니다. 틀리면 까닭 글 */
export function 답더하기(감들: readonly 시험감[], 앞: 시험답, 무엇: string, 몸: unknown): 시험답 | string {
  const 열쇠들 = new Set(감들.map((x) => x.열쇠));
  if (무엇 === '판') {
    const p = (typeof 몸 === 'object' && 몸 !== null ? 몸 : {}) as Record<string, unknown>;
    if (typeof p.끝 !== 'boolean' || (p.이김 !== undefined && typeof p.이김 !== 'boolean')) return '판은 { "끝": true, "이김": false, "까닭": "…", "기록": "<game-play 파일 이름>" } 꼴이다';
    return { ...앞, 판: { 끝: p.끝, ...(typeof p.이김 === 'boolean' ? { 이김: p.이김 } : {}), ...(글인가(p.까닭) ? { 까닭: p.까닭 } : {}), ...(글인가(p.기록) ? { 기록: p.기록 } : {}) } };
  }
  const 줄들 = (Array.isArray(몸) ? 몸 : [몸]) as Record<string, unknown>[];
  let 답 = 앞;
  for (const x of 줄들) {
    const 열쇠 = x?.열쇠;
    if (!글인가(열쇠) || !열쇠들.has(열쇠)) return `시험감에 없는 열쇠다 — ${String(열쇠)}`;
    if (무엇 === '예측') {
      if (답.예측.some((y) => y.열쇠 === 열쇠)) return `${열쇠} — 예측은 한 번만 적는다`;
      if (!글인가(x.조건) || !예측인가(x.예측)) return `${열쇠} — 조건(글)과 예측({ "값": … } · { "최소": n, "최대": n } · { "목록": […] })을 적는다`;
      답 = { ...답, 예측: [...답.예측, { 열쇠, 조건: x.조건, 예측: x.예측 }] };
    } else {
      if (!답.예측.some((y) => y.열쇠 === 열쇠)) return `${열쇠} — 예측부터 적는다`;
      if (답.결과.some((y) => y.열쇠 === 열쇠)) return `${열쇠} — 결과는 한 번만 적는다`;
      if (글인가(x.못잼)) 답 = { ...답, 결과: [...답.결과, { 열쇠, 못잼: x.못잼 }] };
      else if (Array.isArray(x.잰값) && x.잰값.length > 0) 답 = { ...답, 결과: [...답.결과, { 열쇠, 잰값: x.잰값 as unknown[] }] };
      else return `${열쇠} — 잰값(배열)이나 못잼(까닭)을 적는다`;
    }
  }
  return 답;
}

export function 실행(인자: string[], 입력: string): number {
  const [자료, 무엇] = 인자;
  const 감들 = 자료 === undefined ? [] : 시험감읽기(안전히읽기(자료, 게임자리.시험감, 요소상한));
  if (자료 === undefined || (무엇 !== '예측' && 무엇 !== '결과' && 무엇 !== '판')) {
    console.error('쓰는 법: npx tsx scripts/authoring-learn-exam.ts <자료 폴더> 예측 | 결과 | 판 — 값은 표준 입력의 JSON');
    return 2;
  }
  let 몸: unknown;
  try {
    몸 = JSON.parse(입력);
  } catch {
    console.error('[시험] 표준 입력을 JSON 으로 못 읽었다');
    return 1;
  }
  const 답 = 답더하기(감들, 시험답읽기(안전히읽기(자료, 게임자리.시험답, 요소상한)), 무엇, 몸);
  if (typeof 답 === 'string') {
    console.error(`[시험] 안 받음: ${답}`);
    return 1;
  }
  새로쓰기(join(자료, 게임자리.시험답), JSON.stringify(답, null, 1));
  console.log([`[시험] 적음 — 예측 ${답.예측.length} / ${감들.length} · 결과 ${답.결과.length} · 첫 판 ${답.판 === undefined ? '안 해 봄' : '적음'}`, ...정리알림(자료)].join('\n'));
  return 0;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = 실행(process.argv.slice(2), readFileSync(0, 'utf8'));
