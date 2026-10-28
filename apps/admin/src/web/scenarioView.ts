// E2E 시나리오 조립 화면이 쓰는 계산 모음. 화면 없이 검사하려고 순수 함수로 뗐다

import type { ScenarioLink, ScenarioPart } from '@platform/kit';

import { 흐름인가 } from '../scenario/flowSide.js';
import { 단계디바이스 as 도는디바이스 } from '../scenario/mixed.js';

import type { CaseRow, Platform, 앱종류 } from './api.js';
import { t, type 언어 } from './i18n.js';
import { 종류 } from './kind.js';
import type { CasePartMaterial, FlowCandidate, NextCase } from './scenarioApi.js';
import { toValues, type Field } from './schema.js';

type CasePart = Extract<ScenarioPart, { kind: 'case' }>;

// 조립 카드 · 시험 결과 · 실행 결과가 같은 낱말을 쓰게 한 곳에 둔다
export const 종류글: Record<ScenarioPart['kind'], string> = {
  case: '케이스§단계',
  api: 'API 호출',
  mock: '모킹 켜기',
  unmock: '모킹 끄기',
  wait: '대기§단계',
};

/** null 은 재료 없음 — 서버가 404 를 준 비활성 · 사라진 케이스 */
export type 재료들 = Map<string, CasePartMaterial | null>;

export function 카드요약(part: ScenarioPart, 재료: CasePartMaterial | null | undefined, 언어: 언어): string {
  if (part.kind === 'api') return `${part.method} ${part.path} → ${part.expectStatus}`;
  if (part.kind === 'mock') return `${part.urlPattern} → ${part.status}`;
  if (part.kind === 'unmock') return part.urlPattern;
  if (part.kind === 'wait') return t('{초}초 기다림', 언어, { 초: part.ms / 1000 });
  if (재료 === null || 재료 === undefined) return '';

  const 건너뜀 = part.skipSteps.length;
  const 입력 = Object.keys(part.params).length + Object.keys(part.expected).length;
  const 조각 = [
    건너뜀 === 0 ? t('사전 단계 전부 실행', 언어) : t('사전 단계 {수}개 건너뜀', 언어, { 수: 건너뜀 }),
    입력 === 0 ? t('저장값 사용', 언어) : t('입력값 {수}칸 직접 입력', 언어, { 수: 입력 }),
  ];
  if (part.links !== undefined && part.links.length > 0) 조각.push(t('값 연결 {수}개', 언어, { 수: part.links.length }));
  return 조각.join(' · ');
}

/** 케이스 번호 앞 글자 — 단계가 어느 애플리케이션 것인지는 이것으로 읽는다 (도메인/시나리오 §3.7 결정 13) */
export const 케이스접두사 = (tcId: string): string => (tcId.includes('-') ? tcId.slice(0, tcId.indexOf('-')) : tcId);

/** 단계의 애플리케이션 접두사. 케이스는 번호 앞 글자, API 호출은 service 나 시작 애플리케이션, 그 밖은 null */
export function 단계앱(part: ScenarioPart, 시작: string): string | null {
  if (part.kind === 'case') return 케이스접두사(part.tcId);
  return part.kind === 'api' ? (part.service ?? 시작) : null;
}

/** 시작 애플리케이션 밖의 단계가 있나 — 이름표 · 구분선 · 대상 서버 거르기 · 모킹 무늬 제한이 이것을 본다 */
export const 섞였나 = (parts: ScenarioPart[], 시작: string): boolean =>
  parts.some((p) => {
    const 앱 = 단계앱(p, 시작);
    return 앱 !== null && 앱 !== 시작;
  });

/** 같은 프로젝트의 애플리케이션 한 줄 — 로그인 응답의 서비스 줄에서 이만 뽑아 쓴다 */
export interface 앱줄 {
  prefix: string;
  name: string;
  kind?: 앱종류;
  envs: readonly { env: string; apiAuthNames?: readonly string[] }[];
}

/**
 * 대상 서버 선택지 — 시작 애플리케이션의 서버 이름마다, 단계가 쓰는 다른 애플리케이션 가운데 그 이름이 없는 곳의 접두사.
 * 비어 있지 않으면 그 이름은 못 고른다 (도메인/시나리오 §3.7 결정 13)
 */
export function 서버선택지(앱들: readonly 앱줄[], 시작: string, parts: ScenarioPart[]): { env: string; 없는곳: string[] }[] {
  const 든 = new Set(parts.map((p) => 단계앱(p, 시작)));
  const 다른앱 = 앱들.filter((a) => a.prefix !== 시작 && 든.has(a.prefix));
  return (앱들.find((a) => a.prefix === 시작)?.envs ?? []).map(({ env }) => ({
    env,
    없는곳: 다른앱.filter((a) => !a.envs.some((e) => e.env === env)).map((a) => a.prefix),
  }));
}

/** 「N번에서 이미 실행」 칩 — 앞 case 단계 중 그 제목의 절차를 가진 첫 번호. 다른 애플리케이션 것은 안 센다 — 출처가 달라 로그인이 안 넘어간다 */
export function 이미실행(parts: ScenarioPart[], 재료: 재료들, seq: number, 제목: string): number | null {
  const 이 = parts[seq - 1];
  const 이앱 = 이?.kind === 'case' ? 케이스접두사(이.tcId) : null;
  for (let i = 0; i < seq - 1 && i < parts.length; i += 1) {
    const p = parts[i];
    if (p?.kind !== 'case') continue;
    if (이앱 !== null && 케이스접두사(p.tcId) !== 이앱) continue;
    if (재료.get(p.tcId)?.steps.some((s) => s.title === 제목)) return i + 1;
  }
  return null;
}

/** 단계마다 그 단계가 돌 때 걸려 있는 모킹 무늬. 켜기 단계 자신은 다음 단계부터 걸린다 */
export function 모킹구간(parts: ScenarioPart[]): string[][] {
  let 걸림: string[] = [];
  return parts.map((p) => {
    const 지금 = 걸림;
    if (p.kind === 'mock' && !걸림.includes(p.urlPattern)) 걸림 = [...걸림, p.urlPattern];
    if (p.kind === 'unmock') 걸림 = 걸림.filter((u) => u !== p.urlPattern);
    return 지금;
  });
}

export interface 팔레트묶음 {
  feature: string | null;
  흐름: CaseRow[];
  입력값: CaseRow[];
}

/** 그 애플리케이션의 시나리오 디바이스 칩. 앱 · 게임은 「Android 앱」 하나다 (도메인/시나리오 §3.7 결정 16) */
export const 시나리오칩들 = (앱들: readonly 앱줄[], 접두사: string): readonly Platform[] =>
  종류(앱들.find((a) => a.prefix === 접두사)?.kind).시나리오디바이스;

/** 앱 · 게임 애플리케이션인가 — 그 케이스 단계는 폰에서 돈다 */
export const 폰앱인가 = (앱들: readonly 앱줄[], 접두사: string): boolean => 시나리오칩들(앱들, 접두사).includes('android');

/** 그 애플리케이션 케이스가 이 시나리오에서 도는 디바이스 — 팔레트가 이 값으로 거른다. 판정은 서버 조립 검사와 한 함수다 */
export const 단계디바이스 = (앱들: readonly 앱줄[], 접두사: string, 디바이스: Platform): Platform => 도는디바이스(폰앱인가(앱들, 접두사), 디바이스);

/** 앱 · 게임 단계가 하나라도 있나 — 있으면 실행이 폰을 한 번 잡는다 (§3.7 결정 16 「폰은 시나리오 동안 한 번 잡고 한 번 놓는다」) */
export const 폰단계있나 = (앱들: readonly 앱줄[], 단계들: ScenarioPart[]): boolean =>
  단계들.some((p) => p.kind === 'case' && 폰앱인가(앱들, 케이스접두사(p.tcId)));

/** 고른 칩이 시나리오 디바이스와 다른 디바이스(도는)로 돌 때만 붙는 안내 한 줄(영어 표의 키). 같으면 null */
export function 단계디바이스안내(도는: Platform, 디바이스: Platform): string | null {
  if (도는 === 디바이스) return null;
  return 도는 === 'android' ? '앱 단계는 폰에서 돕니다. Android 앱 케이스만 보입니다' : '웹 단계는 PC 화면으로 돕니다. PC 에서 도는 케이스만 보입니다';
}

/**
 * 팔레트 차례. 받은 차례 그대로 기능 묶음마다 흐름 · 입력값 두 칸에 나눈다 — 묶음 차례는 서버가 PRD 차례로 준다(묶음 없음이 맨 뒤).
 * PRD씀은 케이스 목록 응답의 hasFeatures 다 — 케이스 목록과 같은 기준이라 디바이스를 바꿔도 모양이 안 갈린다.
 * PRD 를 안 쓰면 묶음을 가르지 않고 하나로 둔다
 */
export function 팔레트차례(
  cases: CaseRow[],
  platform: Platform,
  PRD씀: boolean,
): { 묶음들: 팔레트묶음[]; 뺀수: number } {
  const 도는 = cases.filter((c) => c.platforms.includes(platform));
  const 묶음 = new Map<string | null, 팔레트묶음>();
  for (const c of 도는) {
    const feature = PRD씀 ? (c.feature ?? null) : null;
    const 곳 = 묶음.get(feature) ?? { feature, 흐름: [], 입력값: [] };
    묶음.set(feature, 곳);
    (흐름인가(c, PRD씀) ? 곳.흐름 : 곳.입력값).push(c);
  }
  return { 묶음들: [...묶음.values()], 뺀수: cases.length - 도는.length };
}

/** 맨 뒤 케이스 단계 — 뒤에 API 호출 · 모킹 · 대기가 붙어도 브라우저 화면은 그대로라 그 케이스가 기준이다 (도메인/시나리오 §8.11 「다음 단계 추천」) */
export function 뒤케이스(parts: ScenarioPart[]): { tcId: string; 번호: number } | null {
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    const p = parts[i];
    if (p?.kind === 'case') return { tcId: p.tcId, 번호: i + 1 };
  }
  return null;
}

/** 추천 줄 — 팔레트 목록 차례 그대로, 고른 디바이스에서 돌고 정상 쪽(흐름 칸)인 것만. 서버는 이어지는 화면에 닿는 케이스를 다 준다 */
export function 추천줄들(cases: CaseRow[], platform: Platform, PRD씀: boolean, 추천: NextCase[]): { row: CaseRow; screen: string }[] {
  const 화면 = new Map(추천.map((x) => [x.tcId, x.screen]));
  return cases.flatMap((c) => {
    const screen = 화면.get(c.tcId);
    return screen !== undefined && c.platforms.includes(platform) && 흐름인가(c, PRD씀) ? [{ row: c, screen }] : [];
  });
}

/** 비운 칸은 필수여도 키를 뺀다 — 서버는 키가 없는 칸만 저장값으로 채운다 */
export function 조립값(fields: Field[], 글자들: Record<string, string>): Record<string, unknown> {
  const 채운 = Object.fromEntries(Object.entries(글자들).filter(([, v]) => v.trim() !== ''));
  const 값 = toValues(fields, 채운);
  for (const f of fields) if (!(f.key in 채운)) delete 값[f.key];
  return 값;
}

// 값 연결이 가리키는 번호 셋(재사용 · 값 주입 · 수정 요청)을 한 곳에서 고친다
function 가리킴바꿔(link: ScenarioLink, 바꿈: (n: number) => number): ScenarioLink {
  if (link.kind === 'reuse') return { ...link, fromSeq: 바꿈(link.fromSeq) };
  if (link.kind === 'bind') return { ...link, value: { ...link.value, fromSeq: 바꿈(link.value.fromSeq) } };
  if (link.kind === 'rewrite') {
    return { ...link, to: { ...link.to, value: { ...link.to.value, fromSeq: 바꿈(link.to.value.fromSeq) } } };
  }
  return link;
}

// API 호출 단계의 값 주입도 앞 단계 번호를 가리킨다 (결정 14)
function 다시가리킴(parts: ScenarioPart[], 바꿈: (n: number) => number): ScenarioPart[] {
  return parts.map((p) => {
    if (p.kind === 'case' && p.links !== undefined) return { ...p, links: p.links.map((l) => 가리킴바꿔(l, 바꿈)) };
    if (p.kind === 'api' && p.values !== undefined) {
      return { ...p, values: p.values.map((v) => ({ ...v, value: { ...v.value, fromSeq: 바꿈(v.value.fromSeq) } })) };
    }
    return p;
  });
}

export function 순서바꾸기(parts: ScenarioPart[], from: number, to: number): ScenarioPart[] {
  const 차례 = parts.map((_, i) => i + 1);
  const [옮김] = 차례.splice(from - 1, 1);
  if (옮김 === undefined) return parts;
  차례.splice(to - 1, 0, 옮김);
  const 새번호 = new Map(차례.map((옛, i) => [옛, i + 1]));
  const 옮긴 = 차례.map((옛) => parts[옛 - 1]!);
  return 다시가리킴(옮긴, (n) => 새번호.get(n) ?? n);
}

/** 뺀 단계를 가리키던 것은 0 — 편집 칸이 다시 고르게 한다 */
export function 빼기(parts: ScenarioPart[], seq: number): ScenarioPart[] {
  const 남음 = parts.filter((_, i) => i !== seq - 1);
  return 다시가리킴(남음, (n) => (n === seq ? 0 : n > seq ? n - 1 : n));
}

/** 0 · 자기 이상 · 못 가리키는 종류를 가리키는 단계 번호. 값 연결은 앞 case 만, API 값 주입은 앞 api 도 된다 (서버 scenario/validate.ts 와 같다) */
export function 가리킴빈곳(parts: ScenarioPart[]): number[] {
  const 빈곳: number[] = [];
  parts.forEach((p, i) => {
    const 자기 = i + 1;
    const 나쁜번호 = (n: number, api도: boolean) => {
      const 앞 = parts[n - 1]?.kind;
      return n < 1 || n >= 자기 || !(앞 === 'case' || (api도 && 앞 === 'api'));
    };
    let 나쁨 = false;
    if (p.kind === 'case') {
      for (const l of p.links ?? []) {
        가리킴바꿔(l, (n) => {
          if (나쁜번호(n, false)) 나쁨 = true;
          return n;
        });
      }
    }
    if (p.kind === 'api') 나쁨 = (p.values ?? []).some((v) => 나쁜번호(v.value.fromSeq, true));
    if (나쁨) 빈곳.push(자기);
  });
  return 빈곳;
}

// 서버 조립 검사(scenario/validate.ts)가 min(1) 로 막는 칸들. 비운 채 저장하면 서버 400 영문 JSON 이 화면을 덮는다
function 빈칸있나(p: ScenarioPart): boolean {
  const 빔 = (글: string) => 글.trim() === '';
  if (p.kind === 'mock' || p.kind === 'unmock') return 빔(p.urlPattern);
  if (p.kind === 'api') {
    return 빔(p.path) || (p.values ?? []).some((v) => 빔(v.name) || 빔(v.value.urlPattern) || 빔(v.value.jsonPath)) || (p.expectJson ?? []).some((c) => 빔(c.jsonPath));
  }
  if (p.kind !== 'case') return false;
  return (p.links ?? []).some(빈연결);
}

/** 값 연결 하나에 서버가 min(1) 로 막는 빈 칸이 있나 — 마법사 「값 연결」도 이것으로 막는다 */
export function 빈연결(l: ScenarioLink): boolean {
  const 빔 = (글: string) => 글.trim() === '';
  if (l.kind === 'bind') return 빔(l.param) || 빔(l.value.urlPattern) || 빔(l.value.jsonPath);
  if (l.kind === 'rewrite') return 빔(l.urlPattern) || 빔(l.to.path) || 빔(l.to.value.urlPattern) || 빔(l.to.value.jsonPath);
  return 빔(l.urlPattern);
}

/** 필수 칸이 빈 첫 단계의 번호. 없으면 null */
export function 빈칸있는단계(parts: ScenarioPart[]): number | null {
  const i = parts.findIndex(빈칸있나);
  return i < 0 ? null : i + 1;
}

/** 모킹 끄기를 맨 끝에 더할 때의 기본 무늬 — 앞에서 켜져 있고 아직 안 꺼진 모킹 중 마지막 것. 없으면 빈칸 */
export function 끄기기본(parts: ScenarioPart[]): string {
  const 걸림 = 모킹구간([...parts, { kind: 'unmock', urlPattern: '' }]).at(-1) ?? [];
  return 걸림.at(-1) ?? '';
}

/** 서버가 넘겨받기를 끈 단계의 건너뛰기 · 값 연결을 400 으로 막는다 */
export function 넘겨받기끄기(part: CasePart): CasePart {
  return { ...part, carryOver: false, skipSteps: [], links: [] };
}

export function 케이스바꾸기(part: CasePart, tcId: string): CasePart {
  return { ...part, tcId, skipSteps: [], params: {}, expected: {} };
}

/**
 * AI 흐름 후보를 단계로 — 값 연결은 받는 케이스 단계에 단다. 후보의 번호는 단계 차례 그대로라 가져올 단계 번호를 고치지 않는다
 * (도메인/시나리오 §3.7 결정 15 「후보의 값 연결은 케이스 단계에 묶여 다닌다」)
 */
export function 후보단계들(후보: FlowCandidate): ScenarioPart[] {
  return 후보.steps.map((s, i) => {
    const links = 후보.links.filter((l) => l.toSeq === i + 1).map((l) => l.link);
    return { kind: 'case', tcId: s.tcId, params: {}, expected: {}, skipSteps: [], ...(links.length === 0 ? {} : { links }) };
  });
}
