// 원장 — 기획서 글자본에서 요구 번호 목록을 뽑는다. 표와 맞대는 쪽은 authoring-ledger-check.ts 다
// 자식(AI)이 아니라 이 스크립트가 뽑는다 — 같은 글이면 같은 원장이 나와야 대조가 성립한다 (도메인/작성 §3.6 「★ 원장」)

import { createHash } from 'node:crypto';
import { extname } from 'node:path';

import type { 읽을자료 } from './authoring-assets.js';
import { type 설계, 설계하기 } from './authoring-design.js';

export interface 원장항목 {
  번호: string;
  /** 어느 자료에서 나왔나 — 자료 이름 */
  자료: string;
  /** 문단 모드만 — 첫 80자. 자식이 P-012 가 어느 글인지 알아야 한다 */
  글?: string;
  /** 요구 글의 지문 — 다음 판과 견줘 바뀐 요구를 기계가 가린다 (§3.6 「요구 지문」) */
  지문: string;
  /** 요구 글에서 코드가 뽑은 경계 · 예외 — 자식이 고르면 요구마다 빠뜨리는 칸이 달라진다. 둘 다 비면 키가 없다 */
  설계?: 설계;
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

/** 빈칸을 하나로 모은 글의 SHA-256 앞 16자 — 서버 변환(pandoc)은 칸 너비가 바뀌면 모든 줄의 빈칸이 달라진다 */
const 지문내기 = (글: string) => createHash('sha256').update(글.replace(/\s+/g, ' ').trim()).digest('hex').slice(0, 16);

// 장 제목 — 앞 장 마지막 요구에 붙이면 제목만 고쳐도 그 요구가 바뀐 것으로 나온다(2026-10-04 계획 검토 실측).
// md 자료는 `#` 만 제목이다(번호 줄은 목록). 변환한 글자본은 「4. 회원」 · 「2.1 공통」처럼 점 번호 뒤 빈칸 **하나**인 짧은 줄이다 —
// 서버 변환의 본문 목록은 「1.  아이디」(빈칸 둘), 맥 변환은 탭이라 갈린다. 「1. 사용자가 누른다」처럼 문장으로 끝나면 제목이 아니다
const 머리글 = (줄: string, md: boolean) =>
  /^#{1,6}\s/.test(줄) || (!md && /^\d+\.(?:\d+\.?)* \S/.test(줄) && 줄.length <= 40 && !/[.다요]$/.test(줄));

// 행 번호 칸 — 「3   REQ-…」 · 「| 3 | REQ-…」. 지문에서 뺀다 — 행 하나를 끼우면 뒤 행 번호가 다 밀린다
const 행번호 = /^(?:[│|]\s*)?\d+(?:\s*[│|]|\s{2,})\s*/;
// 줄 앞 표시 — 표 테두리 · 목록 표시 · 제목 # · 괄호 · 번호 목록(1. · 1))
const 앞표시 = /^(?:[\s│|*•\-#[(【■□▶◦▪○●]+|\d+[.)]\s+)*/u;
// 번호 바로 뒤 조사 — 「REQ-001 을 먼저 거친다」는 다른 요구 글 안의 언급이지 그 번호의 정의가 아니다
const 언급조사 = /^\s*(?:을|를|이|가|은|는|의|에|에서|와|과|로|으로|도|만|부터|까지)(?=$|[\s.,])/;

/** 줄 첫머리(표시 뒤)에 있는 번호. 줄 가운데서 언급한 번호 · 조사가 붙은 언급은 주인이 아니다 */
function 첫머리번호(줄: string): string | null {
  const 뗀것 = 줄.replace(앞표시, '');
  const m = [...뗀것.matchAll(번호식)][0];
  if (m?.[1] === undefined || m.index !== 0) return null;
  return 언급조사.test(뗀것.slice(m[1].length)) ? null : m[1];
}

// 표 「로그인」 열(AUT-F3-45) — 행 글에는 열 이름이 없어 판정 함수가 「예」의 뜻을 모른다. 그래서 원장을 뽑을 때 머리 칸과 행 칸을 맞춘다
const 로그인머리 = /^(?:로그인|인증)(?:\s*(?:필요|여부))?$/;
const 로그인값 = /(?:^|\s)(?:예|필요|관리자)$/;
// 칸 — md · 격자 표는 테두리 글자(칸 안의 `\|` 는 글자다), 서버 변환은 넓은 빈칸 · 탭, 맥 변환은 줄 하나가 칸 하나다
const 칸들 = (줄: string) =>
  (/^[│|]/.test(줄) ? 줄.replace(/^[│|]|(?<!\\)[│|]$/g, '').split(/(?<!\\)[│|]/) : 줄.split(/\t|\s{2,}/)).map((c) => c.trim());

/**
 * 번호 모드 요구 글 — 줄 첫머리에 원장 번호가 있는 줄부터 다음 그런 줄 전까지가 그 번호의 글이다. 줄 단위라 맥 변환(textutil)처럼
 * 칸마다 줄이 나뉘고 빈 줄이 없는 글자본도 요구마다 갈린다. 머리글은 주인을 끊는다. 표에서 첫 칸이 빈 줄(서버 변환 격자 표의 칸 안 목록)은
 * 그 행 주인에 붙고, 원장 번호 없는 새 행은 주인을 끊는다. 숫자만 있는 줄(행 번호 칸)과 테두리는 어디에도 안 붙는다.
 * 첫머리에 한 번도 안 나온 번호(범위의 가운데 · 언급만 됨)는 그 번호가 나온 줄 전부다.
 * `로그인` 은 표 「로그인」 열 값이 예 · 관리자인 번호다 — 머리 칸 수와 행 칸 수가 같을 때만 맞춘다
 */
function 번호글들(글: string, 원장번호: Set<string>): { 글들: Map<string, string>; 로그인: Map<string, string> } {
  const 모음 = new Map<string, string[]>();
  const 언급 = new Map<string, string[]>();
  const 넣기 = (곳: Map<string, string[]>, 번호: string, 줄: string) => {
    const 줄들 = 곳.get(번호);
    if (줄들 === undefined) 곳.set(번호, [줄]);
    else 줄들.push(줄);
  };
  const md = /^#{1,6}\s/m.test(글);
  let 주인: string | null = null;
  // 지금 표의 머리 칸 — 서버 변환 · md 는 칸 여럿인 한 줄, 맥 변환은 제목 뒤 주인 없는 줄을 하나씩 이어 모은다
  let 머리: string[] = [];
  let 머리이음 = false;
  // ponytail: 맥 변환 행 뒤에 제목 없이 붙은 문단 · 서버 변환에서 꺾인 긴 칸은 칸 수가 어긋나 못 읽는다. 잦으면 표 구조를 변환기에서 받는다
  const 행 = new Map<string, { 머리: string[]; 칸: string[]; 줄마다: boolean }>();
  for (const 날줄 of 글.split(/\r?\n/)) {
    const 줄 = 날줄.trim().replace(행번호, '');
    if (줄 === '' || 테두리.test(줄) || /^\d+$/.test(줄)) continue;
    const 번호들 = 번호찾기(줄).번호들.filter((n) => 원장번호.has(n));
    for (const 번호 of 번호들) 넣기(언급, 번호, 줄);
    const 첫 = 첫머리번호(줄);
    const 표줄 = /^[│|]/.test(줄);
    const 칸 = 칸들(날줄.trim());
    if (첫 !== null && 원장번호.has(첫)) {
      주인 = 첫;
      넣기(모음, 첫, 줄);
      행.set(첫, { 머리, 칸, 줄마다: 칸.length === 1 });
      머리이음 = false;
    } else if (머리글(줄, md) || (표줄 && !/^[│|]\s*[│|]/.test(줄) && 번호들.length === 0)) {
      주인 = null;
      머리이음 = 머리글(줄, md);
      머리 = 머리이음 ? [] : 칸;
    } else if (주인 !== null) {
      넣기(모음, 주인, 줄);
      const 지금행 = 행.get(주인);
      if (지금행?.줄마다 === true) 지금행.칸.push(...칸);
    } else {
      머리 = 칸.length === 1 && 머리이음 ? [...머리, ...칸] : 칸;
      머리이음 = 칸.length === 1;
    }
  }
  const 로그인 = new Map<string, string>();
  for (const [번호, { 머리: 머, 칸 }] of 행) {
    const 값 = 칸[머.findIndex((c) => 로그인머리.test(c))];
    if (머.length === 칸.length && 값 !== undefined && 로그인값.test(값)) 로그인.set(번호, 값);
  }
  return { 글들: new Map([...원장번호].map((n) => [n, (모음.get(n) ?? 언급.get(n) ?? []).join('\n')])), 로그인 };
}

// 원장 사본 JSON 이 요구마다 빈 설계로 불지 않게 경계 · 예외가 둘 다 비면 키를 안 싣는다
function 설계칸(요구글: string, 로그인?: string): { 설계?: 설계 } {
  const 설 = 설계하기(요구글);
  // 비로그인 · 일반 회원 요청이 401 · 403 으로 막히는 묶음이다. PRD 옮기기는 「로그인이 필요하다」로 적어 판정 함수가 같은 기법을 낸다
  if (로그인 !== undefined) 설.예외.push({ 기법: '동등 분할', 근거: `로그인: ${로그인}` });
  return 설.경계.length + 설.예외.length > 0 ? { 설계: 설 } : {};
}

/** 자료 하나의 원장. 번호 가족이 없으면 문단 모드다. `머리` 는 문단 번호 앞말(P · P1 · P2) */
export function 원장뽑기(글: string, 자료: string, 머리 = 'P'): 자료원장 {
  const { 번호들, 경고 } = 번호찾기(글);
  const 차례 = [...new Set(번호들)];
  const 셈: Record<string, number> = {};
  for (const 번호 of 차례) 셈[가족(번호)] = (셈[가족(번호)] ?? 0) + 1;
  const 가족들 = Object.fromEntries(Object.entries(셈).filter(([, n]) => n >= 가족하한));
  if (Object.keys(가족들).length > 0) {
    const 원장번호 = 차례.filter((번호) => 가족(번호) in 가족들);
    const { 글들, 로그인 } = 번호글들(글, new Set(원장번호));
    const 항목 = 원장번호.map((번호) => {
      const 요구글 = 글들.get(번호) ?? '';
      return { 번호, 자료, 지문: 지문내기(요구글), ...설계칸(요구글, 로그인.get(번호)) };
    });
    return { 모드: '번호', 항목, 가족: 가족들, 경고 };
  }
  // 설계는 80자로 자른 글이 아니라 문단 전체로 판정한다 — 한도 문장이 80자 뒤에 오면 빠진다
  const 항목 = 문단들(글).map((u, i) => ({ 번호: `${머리}-${String(i + 1).padStart(3, '0')}`, 자료, 글: u.slice(0, 글상한), 지문: 지문내기(u), ...설계칸(u) }));
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
  /** 자료 이름 → 글자본 꼴(`.docx/pandoc`). 서버와 맥은 같은 워드를 다르게 풀어 지문이 다 달라진다 — 꼴이 다르면 견주지 않는다 */
  꼴: Record<string, string>;
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
  const 합친: 원장 = { 항목: [], 가족: {}, 모드: {}, 경고: [], 빠진자료, 꼴: {} };
  let 문단순번 = 0;
  const 본번호 = new Set<string>();
  for (const { c, 글, 첫 } of 뽑은것) {
    const 하나 = 첫.모드 === '문단' && 문단자료수 > 1 ? 원장뽑기(글, c.name, `P${String(++문단순번)}`) : 첫;
    합친.모드[c.name] = 하나.모드;
    합친.꼴 = { ...합친.꼴, [c.name]: `${extname(c.name).toLowerCase()}/${c.변환?.명령 ?? '그대로'}` };
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
