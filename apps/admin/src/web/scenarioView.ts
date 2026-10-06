// E2E 시나리오 조립 화면이 쓰는 계산 모음. 화면 없이 검사하려고 순수 함수로 뗐다

import type { ScenarioLink, ScenarioPart } from '@platform/kit';
import type { Technique } from '@platform/kit/types';

import type { CaseRow, Platform } from './api.js';
import { t, type 언어 } from './i18n.js';
import type { CasePartMaterial } from './scenarioApi.js';
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
    건너뜀 === 0 ? t('준비 전부 실행', 언어) : t('준비 {수}개 건너뜀', 언어, { 수: 건너뜀 }),
    입력 === 0 ? t('저장값 사용', 언어) : t('입력값 {수}칸 직접 입력', 언어, { 수: 입력 }),
  ];
  if (part.links !== undefined && part.links.length > 0) 조각.push(t('값 연결 {수}개', 언어, { 수: part.links.length }));
  return 조각.join(' · ');
}

/** 「N번에서 이미 실행」 칩 — 앞 case 단계 중 그 제목의 절차를 가진 첫 번호 */
export function 이미실행(parts: ScenarioPart[], 재료: 재료들, seq: number, 제목: string): number | null {
  for (let i = 0; i < seq - 1 && i < parts.length; i += 1) {
    const p = parts[i];
    if (p?.kind !== 'case') continue;
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

// 상태 전이 기법이 붙은 케이스는 순서가 있는 흐름이라 단계 팔레트의 흐름 칸에 둔다
const 상태전이: Technique = '상태 전이';

/** 팔레트 두 칸. 상태 전이가 있거나 기법이 없으면 흐름, 그 밖은 입력값 */
export function 팔레트차례(
  cases: CaseRow[],
  platform: Platform,
): { 흐름: CaseRow[]; 입력값: CaseRow[]; 뺀수: number } {
  const 흐름: CaseRow[] = [];
  const 입력값: CaseRow[] = [];
  let 뺀수 = 0;
  for (const c of cases) {
    if (!c.platforms.includes(platform)) {
      뺀수 += 1;
      continue;
    }
    const 기법 = c.techniques ?? [];
    (기법.length === 0 || 기법.some((x) => x === 상태전이) ? 흐름 : 입력값).push(c);
  }
  return { 흐름, 입력값, 뺀수 };
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

function 다시가리킴(parts: ScenarioPart[], 바꿈: (n: number) => number): ScenarioPart[] {
  return parts.map((p) =>
    p.kind === 'case' && p.links !== undefined ? { ...p, links: p.links.map((l) => 가리킴바꿔(l, 바꿈)) } : p,
  );
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

export function 가리킴빈곳(parts: ScenarioPart[]): number[] {
  const 빈곳: number[] = [];
  parts.forEach((p, i) => {
    if (p.kind !== 'case' || p.links === undefined) return;
    const 자기 = i + 1;
    let 나쁨 = false;
    for (const l of p.links) {
      가리킴바꿔(l, (n) => {
        if (n < 1 || n >= 자기 || parts[n - 1]?.kind !== 'case') 나쁨 = true;
        return n;
      });
    }
    if (나쁨) 빈곳.push(자기);
  });
  return 빈곳;
}

/** 서버가 넘겨받기를 끈 단계의 건너뛰기 · 값 연결을 400 으로 막는다 */
export function 넘겨받기끄기(part: CasePart): CasePart {
  return { ...part, carryOver: false, skipSteps: [], links: [] };
}

export function 케이스바꾸기(part: CasePart, tcId: string): CasePart {
  return { ...part, tcId, skipSteps: [], params: {}, expected: {} };
}
