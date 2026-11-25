// 배운 것을 PRD 로 옮기기 — 지도의 배운 줄을 세 갈래(확인 필요 · 판정 요청 · 지도에만)로 가르고, 자식이 적은 옮김 표(game-prd.json)를 표준 기획서 결과와 맞춰 본다 (도메인/게임 §3.10 「배운 것을 PRD · 테스트로」)
// 쓰는 법: npx tsx scripts/authoring-learn-prd.ts <자료 폴더> <접두사> [화면만] — 폰 없이 파일만 읽는다. 0 다 맞음 · 1 고칠 것 있음(화면만이면 빠진 줄도) · 2 부를 수 없음
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import type { PrdItem } from '@platform/kit/types';

import { 꼴, 믿음 } from '../apps/admin/src/prd/gameKinds.js';
import { 본문상한 } from '../apps/admin/src/prd/rules.js';
import { 게임자리, 요소상한 } from './authoring-game.js';
import { type 지도줄, 근거들, 배움떼기, 지금지도 } from './authoring-game-find.js';
import { 랜덤꼴 } from './authoring-learn-exam.js';
import { type 지도, 자름 } from './authoring-learn-map.js';
import { type 옮긴항목, 옮긴것읽기 } from './authoring-prd.js';
import { 안전히읽기 } from './authoring-screens-keep-io.js';

/** 요구가 될 수 없는 종류 — 묶음 머리 · 이기는 법 · 진 까닭 · 재는 법 · 시험 기록 · 궁금한 것 · 이상한 것 · 종류 정의 */
const 안옮길종류 = new Set(['SYSTEM', 'PLAY', 'FAIL', 'PROBE', 'TRIAL', 'ASK', 'ODD', 'KIND']);
/** 2026-11-25 사용자가 정한 첫 값(계획 B-3) — 실측(GAME-F6-05)에서 고친다 */
const 고정최소 = 2;
const 랜덤최소 = 10;
const 확률숫자 = /\d+(?:\.\d+)?\s*(?:%|퍼센트)|\d+(?:\.\d+)?\s*[~∼～〜]\s*\d+|\d+\s*분의\s*\d+/g;

export type 가름 = { 갈래: '확인' | '판정' } | { 갈래: '지도'; 까닭: string };

const 글인가 = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';
const 한칸 = (글: string): string => 글.replace(/\s+/g, ' ').trim();
const 객체 = (v: unknown): Record<string, unknown> => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

/** 배운 줄에 옮겨 둔 게임 글 원문(`data.글` — 한 문장이나 여럿) */
const 게임글들 = (x: 지도줄): string[] => [객체(x.learned?.data).글].flat().filter(글인가).map(한칸);
/** 게임 글과 다르게 잰 것(`data.글다름` — 무엇을 했고 무엇이 나왔나) */
const 글다름 = (x: 지도줄): string | null => {
  const v = 객체(x.learned?.data).글다름;
  return 글인가(v) ? 한칸(v) : null;
};

/** 배운 줄 하나의 갈래. 요구가 될 수 없는 줄이면 null */
export function 가르기(x: 지도줄, 빌드?: string): 가름 | null {
  const l = x.learned;
  if (l === null || 안옮길종류.has(x.kind) || x.key.endsWith(':없음')) return null;
  const 지도에만 = (까닭: string): 가름 => ({ 갈래: '지도', 까닭 });
  if (l.belief !== 'CONFIRMED' && l.belief !== 'GAME_TEXT') return 지도에만(믿음[l.belief ?? 'GUESS']);
  if (l.marks?.includes('CHEAT') === true) return 지도에만('치트로 봄');
  if (l.marks?.includes('HUMAN') === true) return 지도에만('사람이 바로잡음 — 서비스 가이드를 따른다');
  if (빌드 !== undefined && l.build !== undefined && l.build !== 빌드) return 지도에만(`빌드 ${l.build} 에서 봄 — 재확인 전`);
  const 다름 = 글다름(x);
  if (l.belief === 'GAME_TEXT') return 다름 === null ? { 갈래: '확인' } : 지도에만('게임 글과 다르다고 적었지만 확인이 아님');
  if (l.data === undefined || l.build === undefined) return 지도에만('확인인데 잰 값이나 빌드가 없음');
  if (l.shape === 'UNKNOWN') return 지도에만('값의 꼴을 모름');
  const 랜덤 = 랜덤꼴.has(l.shape ?? '');
  // 씨앗을 고정하고 본 것은 분포의 근거가 아니다
  if (랜덤 && l.marks?.includes('SEED') === true) return 지도에만('씨앗을 고정하고 봄');
  if ((l.seen ?? 0) < (랜덤 ? 랜덤최소 : 고정최소)) return 지도에만(`${l.seen ?? 0}번 봄 — ${랜덤 ? `랜덤은 ${랜덤최소}번` : `${고정최소}번`}부터`);
  if (다름 === null) return { 갈래: '확인' };
  return 게임글들(x).length === 0 ? 지도에만('게임 글과 다르다고 적었지만 게임 글 원문(data.글)이 없음') : { 갈래: '판정' };
}

/** 이미 PRD 에 이은 줄 — 요구 번호가 달렸거나 기획서 값이 있다 */
const 이었나 = (x: 지도줄): boolean => 근거들(x).length > 0 || 배움떼기(x.line).앞.includes(' · 기획서 ');

export interface 옮김표 {
  옮김: Map<string, string[]>;
  안옮김: Map<string, string>;
  틀림: string | null;
}

/** 자식이 적은 `game-prd.json` — `{ "옮김": { "<열쇠>": ["<번호>", …] }, "안옮김": { "<열쇠>": "<까닭>" } }`. 없으면 빈 표 */
export function 옮김읽기(글: string | null): 옮김표 {
  const 빈 = (틀림: string | null): 옮김표 => ({ 옮김: new Map(), 안옮김: new Map(), 틀림 });
  if (글 === null) return 빈(null);
  let 몸: Record<string, unknown>;
  try {
    몸 = 객체(JSON.parse(글));
  } catch {
    return 빈(`${게임자리.옮김} 을 JSON 으로 못 읽었다`);
  }
  const 옮김 = new Map<string, string[]>();
  for (const [열쇠, 번호들] of Object.entries(객체(몸.옮김))) {
    if (!Array.isArray(번호들) || 번호들.length === 0 || !번호들.every(글인가)) return 빈(`${게임자리.옮김} 의 ${열쇠} — 요구 번호의 배열을 적는다`);
    옮김.set(열쇠, [...new Set(번호들)]);
  }
  const 안옮김 = new Map<string, string>();
  for (const [열쇠, 까닭] of Object.entries(객체(몸.안옮김))) {
    if (!글인가(까닭)) return 빈(`${게임자리.옮김} 의 ${열쇠} — 안 옮긴 까닭을 적는다`);
    안옮김.set(열쇠, 까닭);
  }
  return { 옮김, 안옮김, 틀림: null };
}

type 가른줄 = { 줄: 지도줄; 가름: 가름 };
export const 가른줄들 = (지금: 지도, 빌드?: string): 가른줄[] =>
  지금.줄들.flatMap((줄) => {
    const 가름 = 가르기(줄, 빌드);
    return 가름 === null ? [] : [{ 줄, 가름 }];
  });

/** PRD 에 아직 안 이었고 옮김 표에도 없는 줄 — 확인 · 판정 갈래만 */
export const 빠진줄들 = (들: readonly 가른줄[], 표: 옮김표): 지도줄[] =>
  들.flatMap(({ 줄, 가름 }) => (가름.갈래 === '지도' || 이었나(줄) || 표.옮김.has(줄.key) || 표.안옮김.has(줄.key) ? [] : [줄]));

const 화면뿐 = (i: Pick<옮긴항목, 'basis'>): boolean => i.basis.every((b) => b.from === '화면');

/** 옮김 표가 결과 항목과 맞나 — 틀린 까닭들 */
export function 옮김검사(들: readonly 가른줄[], 표: 옮김표, 결과: readonly 옮긴항목[], 지금판: readonly PrdItem[]): string[] {
  const 틀림 = 표.틀림 === null ? [] : [표.틀림];
  const 이번 = new Map(결과.flatMap((i) => [i.reqId, i.임시].flatMap((n) => (n === undefined ? [] : [[n, i] as const]))));
  const 모두 = new Map<string, 옮긴항목>([...지금판.map((i) => [i.reqId, i] as const), ...이번]);
  const 가른 = new Map(들.map((x) => [x.줄.key, x]));
  const 항목줄 = new Map<string, 가른줄[]>();
  for (const [열쇠, 번호들] of 표.옮김) {
    const x = 가른.get(열쇠);
    if (x === undefined) {
      틀림.push(`${열쇠} — 지도에 없거나 요구가 될 수 없는 줄이다`);
      continue;
    }
    for (const 번호 of 번호들) {
      const 항목 = 모두.get(번호);
      if (항목 === undefined) {
        틀림.push(`${열쇠} — 표준 기획서에 없는 번호다(${번호})`);
        continue;
      }
      if (x.가름.갈래 === '지도' && 화면뿐(항목)) 틀림.push(`${열쇠} — 지도에만 두는 줄을 ${번호} 로 옮겼다(${x.가름.까닭})`);
      항목줄.set(번호, [...(항목줄.get(번호) ?? []), x]);
    }
  }
  for (const [번호, 줄들] of 항목줄) {
    const 항목 = 모두.get(번호)!;
    const 판정들 = 줄들.filter((x) => x.가름.갈래 === '판정');
    if (항목.status === 'NEEDS_CHECK') {
      if (판정들.length > 0 && 항목.observed === undefined) 틀림.push(`${번호} — 게임 글과 잰 값이 다른 줄(${판정들.map((x) => x.줄.key).join(' · ')})인데 observed 가 없다`);
      // 다 달면 기획서도 없는데 전부 판정 요청 카드가 된다
      if (이번.has(번호) && 화면뿐(항목) && 판정들.length === 0 && 항목.observed !== undefined) 틀림.push(`${번호} — observed 는 게임 글과 잰 값이 다를 때만 단다`);
    }
    if (!이번.has(번호) || !화면뿐(항목)) continue;
    const 근거글 = 항목.basis.map((b) => 한칸(b.quote));
    for (const { 줄 } of 판정들) if (!게임글들(줄).some((g) => 근거글.some((q) => q.includes(g)))) 틀림.push(`${번호} — 근거에 게임 글 「${자름(게임글들(줄)[0]!, 60)}」 이 그대로 없다`);
    const 랜덤줄 = 줄들.filter((x) => 랜덤꼴.has(x.줄.learned?.shape ?? ''));
    if (랜덤줄.length === 0) continue;
    // 게임 글이 말한 확률은 그 글의 값이다 — 본 비율 · 범위만 막는다
    const 글들 = 랜덤줄.flatMap((x) => 게임글들(x.줄));
    const 숫자 = [...항목.text.matchAll(확률숫자)].map((m) => m[0]).filter((s) => !글들.some((g) => g.includes(s)));
    if (숫자.length > 0) 틀림.push(`${번호} — 랜덤 줄(${랜덤줄.map((x) => x.줄.key).join(' · ')})의 본 비율 · 범위를 문장에 적었다(${숫자.join(' · ')}). 문장은 「가끔 ~한다」로 쓰고 표본은 근거에 적는다`);
  }
  return 틀림;
}

/** 에이전트가 남긴 지금 빌드 이름 — 모르면 undefined(빌드 다름을 안 본다) */
export const 지금빌드 = (자료: string): string | undefined => 안전히읽기(자료, 게임자리.빌드, 1_000)?.trim() || undefined;
const 표읽기 = (자료: string): 옮김표 => 옮김읽기(안전히읽기(자료, 게임자리.옮김, 요소상한));

/** 화면만 — 아직 안 옮긴 배운 줄의 열쇠. 지도를 못 읽으면 빈 목록(옮길 재료가 없다) */
export function 안옮긴열쇠(자료: string): string[] {
  const 지금 = 지금지도(자료);
  return 지금 === null ? [] : 빠진줄들(가른줄들(지금, 지금빌드(자료)), 표읽기(자료)).map((x) => x.key);
}

const JSON읽기 = (글: string | null): unknown => {
  try {
    return JSON.parse(글 ?? 'null') as unknown;
  } catch {
    return null;
  }
};

/** 자료 폴더를 읽어 다 본다 — 자식이 부르는 명령과 탐색 체크포인트가 같은 손을 쓴다. 지도가 없으면 null */
export function 옮김보기(자료: string, 접두사: string): { 지금: 지도; 들: 가른줄[]; 빠짐: 지도줄[]; 틀림: string[] } | null {
  const 지금 = 지금지도(자료);
  if (지금 === null) return null;
  const 들 = 가른줄들(지금, 지금빌드(자료));
  const 표 = 표읽기(자료);
  // 자식이 쓴 결과와 에이전트가 둔 지금 판 — 깨졌으면 빈 것으로 본다(번호가 없다고 짚인다)
  const 옮긴 = 옮긴것읽기(JSON읽기(안전히읽기(join(자료, 'out'), 'prd.json', 본문상한)), 접두사);
  const 지금판 = 객체(JSON읽기(안전히읽기(자료, 'prd-current.json', 본문상한 * 2))).items;
  return { 지금, 들, 빠짐: 빠진줄들(들, 표), 틀림: 옮김검사(들, 표, 'items' in 옮긴 ? 옮긴.items : [], Array.isArray(지금판) ? (지금판 as PrdItem[]) : []) };
}

/** 화면만 작성의 탐색 체크포인트가 더 보는 것 — 배운 줄이 빠짐없이 PRD 로 갔나. 비면 지났다 */
export function 화면만못옮김(자료: string, 접두사: string): string[] {
  const r = 옮김보기(자료, 접두사);
  if (r === null) return [];
  return [...r.틀림, ...(r.빠짐.length === 0 ? [] : [`배운 줄 ${r.빠짐.length}개를 PRD 로 안 옮겼다 — ${r.빠짐.slice(0, 10).map((x) => x.key).join(' · ')}${r.빠짐.length > 10 ? ` 외 ${r.빠짐.length - 10}개` : ''}`])];
}

const 줄글 = ({ 줄, 가름 }: 가른줄): string => {
  const l = 줄.learned!;
  const 랜덤 = 랜덤꼴.has(l.shape ?? '') ? ` · 랜덤(${꼴[l.shape!]} — 숫자는 문장에 안 적는다)` : '';
  const 다름 = 가름.갈래 === '판정' ? ` · 게임 글 「${게임글들(줄)[0]!}」 ↔ 잰 값 「${글다름(줄)!}」 — observed 를 단다` : '';
  return `- ${줄.key} · ${줄.name} — ${자름(l.text, 160)}${랜덤}${다름}`;
};

/** 시스템 줄마다 묶는다 — 그 시스템 줄이나 이 줄이 서로를 관련 열쇠로 가리킨다 */
function 묶음글(들: readonly 가른줄[], 지금: 지도): string[] {
  const 시스템 = 지금.줄들.filter((x) => x.kind === 'SYSTEM' && x.learned !== null && x.key !== 'system:없음');
  const 묶음 = ({ 줄 }: 가른줄): string => 시스템.find((s) => s.learned!.related?.includes(줄.key) === true || 줄.learned!.related?.includes(s.key) === true)?.name ?? '시스템 줄이 없음';
  return [...new Set(들.map(묶음))].flatMap((이름) => [`## ${이름}`, ...들.filter((x) => 묶음(x) === 이름).map(줄글)]);
}

export function 실행(인자: string[]): number {
  const [자료, 접두사, 갈래] = 인자;
  const r = 자료 === undefined || 접두사 === undefined || (갈래 !== undefined && 갈래 !== '화면만') ? null : 옮김보기(자료, 접두사);
  if (r === null) {
    console.error('쓰는 법: npx tsx scripts/authoring-learn-prd.ts <자료 폴더> <접두사> [화면만] — 자료 폴더에 game-map.txt 가 있어야 한다');
    return 2;
  }
  const 남은 = new Set(r.빠짐);
  const 옮길 = r.들.filter((x) => 남은.has(x.줄));
  const 지도에만 = r.들.flatMap(({ 줄, 가름 }) => (가름.갈래 === '지도' && !이었나(줄) ? [`- ${줄.key} — ${가름.까닭}`] : []));
  console.log([
    `# 배운 것 → PRD — 아직 안 옮긴 줄 ${옮길.length}(확인 ${옮길.filter((x) => x.가름.갈래 === '확인').length} · 판정 ${옮길.filter((x) => x.가름.갈래 === '판정').length}) · 이미 이은 줄 ${r.들.filter((x) => 이었나(x.줄)).length} · 지도에만 둘 줄 ${지도에만.length}. 줄 전부는 찾기 명령으로 본다`,
    ...묶음글(옮길, r.지금),
    ...(지도에만.length === 0 ? [] : ['## 지도에만 — PRD 에 쓰지 않는다', ...지도에만]),
    ...r.틀림.map((s) => `고칠 것: ${s}`),
  ].join('\n'));
  return r.틀림.length > 0 || (갈래 === '화면만' && 옮길.length > 0) ? 1 : 0;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = 실행(process.argv.slice(2));
