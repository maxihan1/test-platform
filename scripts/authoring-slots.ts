// 칸 번호 — 요구사항 표 줄마다 칸(요구 · 갈래 · 축 · 상태)과 그 줄이 가져야 할 tcId 를 정하는 순수 함수
// AI 대신 코드가 정한다 — 같은 기획서를 여러 번 돌려도 같은 요구는 같은 칸 · 같은 번호가 되게 (도메인/작성 §3.6 「★ 원장」 「칸과 번호」).
// 표 글은 모른다 — 읽기는 authoring-ledger-check.ts 가 하고 읽은 줄을 넘긴다(거꾸로 import 하면 순환이 생긴다)

import { TCID, tcId종류, 번호열쇠 } from '../apps/admin/src/catalog/rules.js';
import { 번호열머리 } from './authoring-conflicts-apply.js';
import { 번호찾기 } from './authoring-ledger.js';

/** 한 케이스(덩이)에 줄 몇 개까지 — R5 의 확인 10문장과 같은 값 */
export const 칸줄상한 = 10;

export interface 표줄 {
  /** 요구사항 표 안 줄 차례(0부터) */
  차례: number;
  출처: string;
  축: string;
  /** 백틱을 벗긴 글 */
  tcId: string;
}

export interface 칸재료 {
  접두사: string;
  기준줄: string[];
  칸: Record<string, string>;
  /** 옛 표 줄의 tcId 후보 — 칸 열쇠 → 고를 차례의 tcId 들. 옛 표가 아니면 없다 (PRD-F3-03) */
  옛칸?: Record<string, string[]>;
  쓰인: string[];
}

export interface 칸결과 {
  /** 차례 → 그 줄이 가져야 할 tcId */
  기대: Map<number, string>;
  어긋남: string[];
  알림: string[];
}

type 갈래 = 'UI' | 'FN';
const 축차례 = ['UI', '정상', '경계', '예외'] as const;
type 축 = (typeof 축차례)[number];
const 상태차례 = ['정식', '미확정', '보류', '모킹', '오류추정'] as const;
type 상태 = (typeof 상태차례)[number];

const 오류추정표시 = /오류 추정\s*[—–]/;

/** 오류 추정 점검 목록 줄인가 — 칸 상태와 따로 본다. 보류가 같이 적혀 보류 칸이 돼도 설계 칸을 못 채우고 기대 기법은 오류 추정이다 (작성 §3.6 「오류 추정」) */
export const 오류추정줄인가 = (출처: string): boolean => 오류추정표시.test(출처);

// 앞에서부터 먼저 맞는 것 — 한 출처에 표시가 둘 적혀도 한 상태로 떨어지게. 줄표(— –)만 본다 — 붙임표는 「보류-해제」 같은 낱말에 든다.
// 보류는 케이스 통째라 맨 앞이다. 오류 추정이 미확정 · 모킹보다 앞이어야 표시가 섞여도 점검 목록 줄끼리 한 케이스로 모인다
const 상태표시: [RegExp, 상태][] = [
  [/보류\s*[—–]/, '보류'],
  [오류추정표시, '오류추정'],
  [/화면 검사\s*[—–]|화면에만\s*[—–]|차이\s*D\d+/, '미확정'],
  [/모킹\s*[—–]/, '모킹'],
];

// 점검 목록 차례 — 칸 차례도 이것이다. 한 요구에 걸린 항목들이 한 케이스로 묶이면 모킹 · 다른 계정 · 두 번 누르기가 섞인다 (작성 §3.6 「오류 추정」)
const 오류추정항목들 = ['빈 값', '공백만', '두 번 누르기', '남의 것', '없는 주소', '서버 실패'];

/** 표시 뒤 항목 — 목록 낱말로 시작하면 그 낱말(「빈 값 · 아이디 칸」 → 빈 값), 아니면 표시 뒤 글 그대로 */
function 오류추정항목(출처: string): string {
  const 뒤 = (/오류 추정\s*[—–]\s*([^·]*)/.exec(출처)?.[1] ?? '').trim().replace(/\s+/g, ' ');
  return 오류추정항목들.find((항목) => 뒤.startsWith(항목)) ?? 뒤;
}

/** 출처 칸의 상태 표시 → 상태. 표시가 없으면 정식 */
export function 줄상태(출처: string): 상태 {
  return 상태표시.find(([식]) => 식.test(출처))?.[1] ?? '정식';
}
const 기능축차례: Record<축, number> = { UI: 0, 정상: 1, 경계: 2, 예외: 3 };

// 문단 모드 번호는 글 속 자리일 뿐이라 개정판에서 엉뚱한 문단이 물려받는다 — 번호 모드 요구만 물려받는다
const 문단번호 = /^P\d*-\d+$/;

const 세자리 = (수: number) => String(수).padStart(3, '0');
const 축인가 = (글: string): 글 is 축 => (축차례 as readonly string[]).includes(글);
const 제거한줄 = (줄: 표줄) => 줄.tcId.startsWith('제거함(');

/** 기준(main) 표 줄을 알아보는 열쇠 — 출처의 빈칸 수가 달라도 같은 줄이다. 축이 들어야 축만 바꾼 줄이 기준 줄로 검사를 비켜 가지 않는다 */
export function 기준줄열쇠(줄: Pick<표줄, 'tcId' | '축' | '출처'>): string {
  return `${줄.tcId}|${줄.축.trim()}|${줄.출처.trim().replace(/\s+/g, ' ')}`;
}

interface 덩이 {
  /** `${요구}|${갈래}|${축}|${상태}#${번째}` — 오류 추정 칸은 상태 뒤에 `:${항목}` */
  열쇠: string;
  /** 원장 번호 · 원장 밖 번호 · 번호가 없으면 `#${줄 차례}` */
  요구: string;
  /** 1부터. 원장 밖 요구면 없다 */
  원장차례: number | undefined;
  갈래: 갈래;
  축: 축;
  상태: 상태;
  /** 오류 추정 칸의 점검 목록 항목. 다른 상태는 빈 글 */
  항목: string;
  /** 한 칸 안 몇째 덩이(0부터) */
  번째: number;
  줄들: 표줄[];
}

// 칸 차례 — 원장 요구(원장 차례) → 원장 밖 번호(글자 차례) → 번호 없는 줄(표 차례)
const 무리 = (d: 덩이) => (d.원장차례 !== undefined ? 0 : d.요구.startsWith('#') ? 2 : 1);
const 무리안차례 = (d: 덩이) => d.원장차례 ?? (d.요구.startsWith('#') ? Number(d.요구.slice(1)) : 0);
const 글차례 = (가: string, 나: string) => (가 < 나 ? -1 : 가 > 나 ? 1 : 0);
const 항목차례 = (항목: string) => {
  const i = 오류추정항목들.indexOf(항목);
  return i === -1 ? 오류추정항목들.length : i;
};
const 칸차례 = (가: 덩이, 나: 덩이) =>
  무리(가) - 무리(나) ||
  무리안차례(가) - 무리안차례(나) ||
  글차례(가.요구, 나.요구) ||
  축차례.indexOf(가.축) - 축차례.indexOf(나.축) ||
  상태차례.indexOf(가.상태) - 상태차례.indexOf(나.상태) ||
  항목차례(가.항목) - 항목차례(나.항목) ||
  글차례(가.항목, 나.항목) ||
  가.번째 - 나.번째;

/** 줄들을 칸 · 덩이로 묶어 칸 차례로 돌려준다. 축이 넷 밖인 줄은 어긋남에 싣고 뺀다 */
function 덩이로묶기(줄들: 표줄[], 원장번호들: string[], 어긋남: string[]): 덩이[] {
  const 원장차례 = new Map<string, number>();
  원장번호들.forEach((번호, i) => {
    if (!원장차례.has(번호)) 원장차례.set(번호, i + 1);
  });
  const 칸들 = new Map<string, Omit<덩이, '열쇠' | '번째'>>();
  for (const 줄 of [...줄들].sort((가, 나) => 가.차례 - 나.차례)) {
    const 축 = 줄.축.trim();
    if (!축인가(축)) {
      어긋남.push(`요구 줄 ${줄.차례 + 1} 축 「${축}」 — UI · 정상 · 경계 · 예외 중 하나가 아니다`);
      continue;
    }
    const 번호들 = 번호찾기(줄.출처).번호들;
    let 앞: { 요구: string; 원장차례: number } | undefined;
    for (const 번호 of 번호들) {
      const i = 원장차례.get(번호);
      if (i !== undefined && (앞 === undefined || i < 앞.원장차례)) 앞 = { 요구: 번호, 원장차례: i };
    }
    const 요구 = 앞?.요구 ?? 번호들[0] ?? `#${줄.차례}`;
    const 갈래: 갈래 = 축 === 'UI' ? 'UI' : 'FN';
    const 상태 = 줄상태(줄.출처);
    const 항목 = 상태 === '오류추정' ? 오류추정항목(줄.출처) : '';
    const 칸열쇠 = `${요구}|${갈래}|${축}|${상태}${상태 === '오류추정' ? `:${항목}` : ''}`;
    const 칸 = 칸들.get(칸열쇠) ?? { 요구, 원장차례: 앞?.원장차례, 갈래, 축, 상태, 항목, 줄들: [] };
    칸.줄들.push(줄);
    칸들.set(칸열쇠, 칸);
  }
  const 덩이들: 덩이[] = [];
  for (const [칸열쇠, 칸] of 칸들) {
    for (let 번째 = 0; 번째 * 칸줄상한 < 칸.줄들.length; 번째 += 1) {
      const 줄들 = 칸.줄들.slice(번째 * 칸줄상한, (번째 + 1) * 칸줄상한);
      덩이들.push({ ...칸, 열쇠: `${칸열쇠}#${번째}`, 번째, 줄들 });
    }
  }
  return 덩이들.sort(칸차례);
}

const 물려받는가 = (d: 덩이) => d.원장차례 !== undefined && !문단번호.test(d.요구);

/**
 * 기준 표 줄로 칸 재료를 만든다 — (칸, 덩이)마다 덩이 안에서 처음 쓸 만한 tcId. 한 번호를 두 덩이에 주지 않는다.
 * `옛번호` 는 원본 번호 → 그 번호를 근거로 단 표준 기획서 항목 번호들(원장 차례)이다. 표준 기획서 전에 만든 표(옛 표)의 줄은 출처가
 * 원본 번호라 원장 칸이 아니다 — 그 tcId 를 후보 항목들의 같은 칸 후보(`옛칸`)에 쌓고, 칸번호가 원장 차례로 아직 안 준 첫 후보를 준다
 * (작성 §3.6 「★ 표준 기획서」 「기존 서비스」 · PRD-F3-03)
 */
export function 칸재료만들기(
  접두사: string,
  기준줄들: 표줄[],
  쓰인: Iterable<string>,
  원장번호들: string[],
  옛번호: ReadonlyMap<string, readonly string[]> = new Map(),
): 칸재료 {
  const 칸: Record<string, string> = {};
  const 준번호 = new Set<string>();
  const 덩이들 = 덩이로묶기(기준줄들.filter((줄) => !제거한줄(줄)), 원장번호들, []);
  const 줄것 = (d: 덩이) => d.줄들.map((줄) => 줄.tcId).find((t) => TCID.test(t) && tcId종류(t) === d.갈래 && !준번호.has(번호열쇠(t)));
  for (const d of 덩이들) {
    if (!물려받는가(d)) continue;
    const t = 줄것(d);
    if (t === undefined) continue;
    칸[d.열쇠] = t;
    준번호.add(번호열쇠(t));
  }
  // 옛 표 줄 — 덩이 줄들의 원본 번호 전부로 후보 항목을 찾는다(첫 번호만 보면 뒤 번호만 근거로 단 항목이 못 받는다)
  const 옛칸: Record<string, string[]> = {};
  const 걸린수 = new Map<string, number>();
  for (const d of 덩이들) {
    if (d.원장차례 !== undefined) continue;
    const 원본들 = new Set(d.줄들.flatMap((줄) => 번호찾기(줄.출처).번호들).filter((n) => !문단번호.test(n)));
    const 후보 = new Set([...원본들].flatMap((n) => 옛번호.get(n) ?? []));
    const t = 후보.size === 0 ? undefined : 줄것(d);
    if (t === undefined) continue;
    const 꼬리 = d.열쇠.slice(d.요구.length);
    for (const 번호 of 후보) (옛칸[`${번호}${꼬리}`] ??= []).push(t);
    걸린수.set(t, (걸린수.get(t) ?? 0) + 후보.size);
  }
  // 갈 곳이 적은 번호를 앞에 — 쪼개진 원본의 번호가 다른 원본의 하나뿐인 자리를 먼저 가져가 그 번호를 잃지 않게.
  // ponytail: 탐욕 배정이다. 후보가 얽혀 그래도 잃으면 PR 머리 「새 표에 없음」에 보인다 — 잦으면 이분 매칭으로 바꾼다
  for (const 목록 of Object.values(옛칸)) 목록.sort((가, 나) => (걸린수.get(가) ?? 0) - (걸린수.get(나) ?? 0));
  return {
    접두사,
    // tcId 칸이 「—」인 줄(판정 불가 · 철회)도 기준 줄이다 — 번호 명령이 사람의 줄을 덮어쓰지 않게. 빈칸만 뺀다
    기준줄: 기준줄들.filter((줄) => 줄.tcId !== '').map(기준줄열쇠),
    칸,
    ...(Object.keys(옛칸).length > 0 ? { 옛칸 } : {}),
    쓰인: [...new Set(쓰인)].sort(),
  };
}

/** 줄마다 가져야 할 tcId. 판정은 칸 차례로 해서 줄 배열 순서가 결과를 바꾸지 않는다 */
export function 칸번호(원장번호들: string[], 줄들: 표줄[], 재료: 칸재료): 칸결과 {
  const 어긋남: string[] = [];
  const 알림: string[] = [];
  const { 접두사 } = 재료;
  const n = 원장번호들.length;
  // 고정 범위 끝 — 이 번호까지는 원장 차례로 정해진 자리다. 세 자리를 넘으면 고정을 접고 칸 차례로 잇는다
  const 끝: Record<갈래, number> = { UI: n, FN: 3 * n };
  for (const 갈래 of ['UI', 'FN'] as const) {
    if (끝[갈래] <= 999) continue;
    끝[갈래] = 0;
    알림.push(`번호 상한 — 원장 ${n}개라 ${갈래 === 'UI' ? 'UI' : '기능'} 번호를 칸 차례로 매겼다`);
  }
  const 기준 = new Set(재료.기준줄);
  const 덩이들 = 덩이로묶기(
    줄들.filter((줄) => !제거한줄(줄) && !기준.has(기준줄열쇠(줄))),
    원장번호들,
    어긋남,
  );
  // 옛 꼴 P-004 와 P-FN-004 는 한 번호 — 같은 숫자를 두 번 쓰면 실행 이력이 섞인다
  const 잡힌 = new Set(재료.쓰인.map(번호열쇠));
  const 번호 = new Map<덩이, string>();
  const 정하기 = (d: 덩이, tcId: string) => {
    번호.set(d, tcId);
    잡힌.add(번호열쇠(tcId));
  };
  // 판정 차례가 결과를 바꾸지 않게 — 물려받기 · 고정을 모든 덩이에 먼저, 그다음 유지, 마지막에 새 번호
  for (const d of 덩이들) {
    const 물려 = 재료.칸[d.열쇠];
    if (물려받는가(d) && 물려 !== undefined) 정하기(d, 물려);
  }
  // 옛 표 번호는 후보 칸 여럿에 걸려 있다 — 칸 차례(원장 차례)로 아직 안 준 첫 후보를 받는다. 원장 칸 물려받기가 먼저다
  const 준 = new Set([...번호.values()].map(번호열쇠));
  for (const d of 덩이들) {
    if (번호.has(d) || !물려받는가(d)) continue;
    const 옛 = 재료.옛칸?.[d.열쇠]?.find((t) => !준.has(번호열쇠(t)));
    if (옛 === undefined) continue;
    정하기(d, 옛);
    준.add(번호열쇠(옛));
  }
  for (const d of 덩이들) {
    if (번호.has(d) || d.상태 !== '정식' || d.번째 !== 0 || d.원장차례 === undefined || 끝[d.갈래] === 0) continue;
    const i = d.원장차례;
    const 고정 =
      d.갈래 === 'UI' ? `${접두사}-UI-${세자리(i)}` : `${접두사}-FN-${세자리((i - 1) * 3 + 기능축차례[d.축])}`;
    if (!잡힌.has(번호열쇠(고정))) 정하기(d, 고정);
  }
  // 지금 표에 이미 매긴 뒤 번호는 둔다 — 앞 차례에 칸이 생길 때마다 다시 매기면 이미 쓴 케이스 파일과 어긋난다
  // 덩이 안에서 번호가 적힌 줄을 찾는다 — 첫 줄만 보면 같은 칸 앞자리에 새 줄을 끼울 때 번호가 밀린다(2026-10-04 spec-review)
  const 둘만한가 = (d: 덩이, tcId: string) => {
    const 열 = 번호열머리(tcId);
    // 옛 꼴(종류 글자 없음)은 안 둔다 — 새 번호는 -UI- · -FN- 을 단다(R17)
    if (!TCID.test(tcId) || 열?.머리 !== 접두사 || 열.꼴 === '옛' || tcId종류(tcId) !== d.갈래) return false;
    return 열.번호 > 끝[d.갈래] && !잡힌.has(번호열쇠(tcId));
  };
  for (const d of 덩이들) {
    if (번호.has(d)) continue;
    const 둘것 = d.줄들.map((줄) => 줄.tcId).find((tcId) => 둘만한가(d, tcId));
    if (둘것 !== undefined) 정하기(d, 둘것);
  }
  const 다음: Record<갈래, number> = { UI: 끝.UI, FN: 끝.FN };
  for (const 열쇠 of 잡힌) {
    const 열 = 번호열머리(열쇠);
    if (열 === null || 열.머리 !== 접두사) continue;
    const 갈래 = 열.꼴 === 'UI' ? 'UI' : 'FN';
    다음[갈래] = Math.max(다음[갈래], 열.번호);
  }
  for (const d of 덩이들) {
    if (번호.has(d)) continue;
    다음[d.갈래] += 1;
    if (다음[d.갈래] > 999) {
      for (const 줄 of d.줄들) 어긋남.push(`요구 줄 ${줄.차례 + 1} — 새 번호가 999 를 넘는다`);
      continue;
    }
    정하기(d, `${접두사}-${d.갈래}-${세자리(다음[d.갈래])}`);
  }
  const 기대 = new Map<number, string>();
  for (const [d, tcId] of 번호) for (const 줄 of d.줄들) 기대.set(줄.차례, tcId);
  return { 기대, 어긋남, 알림 };
}
