// 원장 — 기획서 글자본에서 요구 번호 목록을 뽑는다. 표와 맞대는 쪽은 authoring-ledger-check.ts 다
// 자식(AI)이 아니라 이 스크립트가 뽑는다 — 같은 글이면 같은 원장이 나와야 대조가 성립한다 (도메인/작성 §3.6 「★ 원장」)

import type { 읽을자료 } from './authoring-assets.js';

export interface 원장항목 {
  번호: string;
  /** 어느 자료에서 나왔나 — 자료 이름 */
  자료: string;
  /** 문단 모드만 — 첫 80자. 자식이 P-012 가 어느 글인지 알아야 한다 */
  글?: string;
}

export interface 자료원장 {
  모드: '번호' | '문단';
  항목: 원장항목[];
  /** 번호 모드 가족별 개수. 화면 ID · 오류 코드 가족이 섞였으면 사람이 여기서 본다 */
  가족: Record<string, number>;
  경고: string[];
}

// 앞뒤 경계는 [A-Za-z0-9.-] 가 아닌 글자 — 조사 · 괄호 · 표 칸은 잡고 긴 번호 속 짧은 번호는 안 잡는다.
// 뒤쪽 마침표는 숫자가 이어질 때만 번호다(FR-1.2). 문장 끝 마침표는 번호가 아니다
const 번호꼴 = String.raw`[A-Z][A-Z0-9]*(?:-[A-Z][A-Z0-9]*)*-\d+(?:\.\d+)*`;
const 번호식 = new RegExp(String.raw`(?<![A-Za-z0-9.\-])(${번호꼴})(?![A-Za-z0-9\-]|\.\d)`, 'g');
const 범위뒤식 = new RegExp(String.raw`^\s*[~～]\s*(?:(${번호꼴})|(\d+))(?![A-Za-z0-9\-]|\.\d)`);
const 범위상한 = 200;

/** 번호의 가족 — 맨 끝 `-숫자` 앞. `REQ-COM-001` → `REQ-COM` */
export function 가족(번호: string): string {
  return 번호.slice(0, 번호.lastIndexOf('-'));
}

function 끝숫자(번호: string): string {
  return 번호.slice(번호.lastIndexOf('-') + 1);
}

/** 범위 양 끝을 펼친다. 못 펼치면 null — 부르는 쪽이 양 끝만 두고 경고한다 */
function 펼치기(시작: string, 끝: string): string[] | null {
  if (가족(시작) !== 가족(끝)) return null;
  const [a, b] = [끝숫자(시작), 끝숫자(끝)];
  if (!/^\d+$/.test(a) || !/^\d+$/.test(b)) return null;
  const [s, e] = [Number(a), Number(b)];
  if (e <= s || e - s + 1 > 범위상한) return null;
  // 0 으로 채운 번호(001)만 자릿수를 맞춘다. 채우지 않은 번호(8~10)는 그대로
  const 폭 = a.length > 1 && a.startsWith('0') ? a.length : 0;
  return Array.from({ length: e - s + 1 }, (_, i) => `${가족(시작)}-${String(s + i).padStart(폭, '0')}`);
}

/** 글에서 번호를 나온 순서대로 찾는다(중복 포함). 추출과 대조가 이 함수 하나를 쓴다 */
export function 번호찾기(글: string): { 번호들: string[]; 경고: string[] } {
  const 번호들: string[] = [];
  const 경고: string[] = [];
  for (const m of 글.matchAll(번호식)) {
    const 시작 = m[1];
    if (시작 === undefined) continue;
    // 범위의 끝은 이 반복에서 이미 처리했다 — 끝이 온전한 번호면 다음 매치로 다시 나온다.
    // 바로 앞 몇 글자만 본다 — 앞 글 전체를 번호마다 다시 훑으면 번호가 빽빽한 큰 글에서 제곱 시간이 된다 (2026-09-30 보안 검토)
    const 앞 = 글.slice(Math.max(0, m.index - 16), m.index);
    if (/[~～]\s*$/.test(앞)) continue;
    const 뒤 = 범위뒤식.exec(글.slice(m.index + 시작.length));
    if (뒤 === null) {
      번호들.push(시작);
      continue;
    }
    const 끝 = 뒤[1] ?? `${가족(시작)}-${뒤[2] ?? ''}`;
    const 펼친것 = 펼치기(시작, 끝);
    if (펼친것 === null) {
      번호들.push(시작, 끝);
      경고.push(`범위 ${시작}~${끝} 를 펼치지 못해 양 끝만 넣었다`);
    } else {
      번호들.push(...펼친것);
    }
  }
  return { 번호들, 경고 };
}

/** 가족마다 서로 다른 번호가 셋 이상이면 요구 번호 체계로 본다 — 외톨이(UTF-8 · ISO-9001)를 거른다 */
export const 가족하한 = 3;

/** 요구로 셀 만큼 긴가 — 빈칸 뺀 15자. 머리글 · 「필수」 같은 칸 조각을 거른다 */
const 짧은글 = 15;
const 글상한 = 80;
const 테두리 = /^[\s\-=+│|─┼:]+$/;
const 목록항목 = /^\s*(?:[-*•]|\d+[.)])\s+/;
// pandoc 표 행은 칸 사이가 빈칸 여럿이다. 테두리 글자로 시작하는 표도 행마다 가른다
const 표행 = (줄: string) => /^\s*[│|]/.test(줄) || (줄.trim().match(/\S\s{3,}(?=\S)/g) ?? []).length >= 2;

/** 문단 모드 — 빈 줄로 가른 덩이마다, 목록 항목과 표 행은 줄마다 하나. 번호는 나온 순서 */
function 문단들(글: string): string[] {
  const 단위: string[] = [];
  let 모음: string[] = [];
  const 내기 = () => {
    if (모음.length > 0) 단위.push(모음.join(' '));
    모음 = [];
  };
  for (const 날줄 of 글.split(/\r?\n/)) {
    const 줄 = 날줄.trim();
    if (줄 === '' || 테두리.test(줄)) {
      내기();
      continue;
    }
    if (목록항목.test(날줄) || 표행(날줄)) {
      내기();
      단위.push(줄);
      continue;
    }
    모음.push(줄);
  }
  내기();
  return 단위.filter((u) => u.replace(/\s/g, '').length >= 짧은글);
}

/** 자료 하나의 원장. 번호 가족이 없으면 문단 모드다. `머리` 는 문단 번호 앞말(P · P1 · P2) */
export function 원장뽑기(글: string, 자료: string, 머리 = 'P'): 자료원장 {
  const { 번호들, 경고 } = 번호찾기(글);
  const 차례 = [...new Set(번호들)];
  const 셈: Record<string, number> = {};
  for (const 번호 of 차례) 셈[가족(번호)] = (셈[가족(번호)] ?? 0) + 1;
  const 가족들 = Object.fromEntries(Object.entries(셈).filter(([, n]) => n >= 가족하한));
  if (Object.keys(가족들).length > 0) {
    const 항목 = 차례.filter((번호) => 가족(번호) in 가족들).map((번호) => ({ 번호, 자료 }));
    return { 모드: '번호', 항목, 가족: 가족들, 경고 };
  }
  const 항목 = 문단들(글).map((u, i) => ({ 번호: `${머리}-${String(i + 1).padStart(3, '0')}`, 자료, 글: u.slice(0, 글상한) }));
  return { 모드: '문단', 항목, 가족: {}, 경고 };
}

export interface 원장 {
  항목: 원장항목[];
  가족: Record<string, number>;
  /** 자료 이름 → 모드 */
  모드: Record<string, '번호' | '문단'>;
  경고: string[];
  /** 글자본이 없어 원장에 못 넣은 자료 — PR 본문에 싣는다 */
  빠진자료: string[];
}

/** 글자본으로 읽을 수 있는 자료인가 — 워드는 에이전트가 .txt 로 바꿔 둔다. PDF 는 바꾸지 않는다 */
const 글자본 = (경로: string) => /\.(txt|md)$/i.test(경로);

/**
 * 요청의 자료 전부로 원장을 만든다. 자료마다 모드를 따로 판정하고 겹치는 번호는 하나로 친다.
 * `읽기` 를 받는 까닭 — 파일을 읽는 것은 껍데기의 일이고, 이 함수는 같은 글이면 같은 원장을 내야 한다.
 * `읽기` 가 null 이면 그 자료는 못 읽은 것이다 — 빈 글로 치면 요구 0 인 원장이 「빠짐 0」 으로 통과해 보인다
 */
export function 원장만들기(
  계획: 읽을자료[],
  읽기: (경로: string) => string | null,
): { 원장: 원장 } | { 없음: string } {
  const 글자료 = 계획.filter((c): c is Extract<읽을자료, { kind: 'FILE' }> => c.kind === 'FILE' && 글자본(c.읽을자리));
  const 빠진자료 = 계획
    .filter((c) => c.kind === 'FILE' && !글자본(c.읽을자리))
    .map((c) => (c.kind === 'FILE' ? `${c.name}(${c.읽을자리.split('.').pop()?.toUpperCase() ?? ''})` : ''));
  const 뽑은것 = 글자료.flatMap((c) => {
    const 글 = 읽기(c.읽을자리);
    if (글 === null) {
      빠진자료.push(`${c.name}(글자본을 못 읽음)`);
      return [];
    }
    return [{ c, 글, 첫: 원장뽑기(글, c.name) }];
  });
  const 피그마 = 계획.filter((c) => c.kind === 'FIGMA').length;
  const 못읽음 = [...빠진자료, ...(피그마 > 0 ? [`피그마 ${String(피그마)}건`] : [])];
  if (뽑은것.length === 0) return { 없음: `글자본이 있는 자료가 없다${못읽음.length > 0 ? ` — ${못읽음.join(' · ')}` : ''}` };

  const 문단자료수 = 뽑은것.filter(({ 첫 }) => 첫.모드 === '문단').length;
  const 합친: 원장 = { 항목: [], 가족: {}, 모드: {}, 경고: [], 빠진자료 };
  let 문단순번 = 0;
  const 본번호 = new Set<string>();
  for (const { c, 글, 첫 } of 뽑은것) {
    const 하나 = 첫.모드 === '문단' && 문단자료수 > 1 ? 원장뽑기(글, c.name, `P${String(++문단순번)}`) : 첫;
    합친.모드[c.name] = 하나.모드;
    합친.경고.push(...하나.경고);
    for (const 항 of 하나.항목) {
      if (본번호.has(항.번호)) continue;
      본번호.add(항.번호);
      합친.항목.push(항);
    }
  }
  // 가족 수는 겹친 번호를 걸러 낸 뒤에 센다 — 자료마다 센 것을 더하면 요약과 셈이 어긋난다 (2026-09-30 코드 검토)
  for (const 항 of 합친.항목) if (항.글 === undefined) 합친.가족[가족(항.번호)] = (합친.가족[가족(항.번호)] ?? 0) + 1;
  return { 원장: 합친 };
}
