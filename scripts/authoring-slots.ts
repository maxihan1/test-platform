// 칸 번호 — 요구사항 표 줄마다 칸(요구 · 갈래 · 축 · 상태)과 그 줄이 가져야 할 tcId 를 정하는 순수 함수
// AI 대신 코드가 정한다 — 같은 기획서를 여러 번 돌려도 같은 요구는 같은 칸 · 같은 번호가 되게 (도메인/작성 §3.6 「★ 원장」 「칸과 번호」).
// 표 글은 모른다 — 읽기는 authoring-ledger-check.ts 가 하고 읽은 줄을 넘긴다(거꾸로 import 하면 순환이 생긴다)

import { TCID, tcId종류, 번호열쇠 } from '../apps/admin/src/catalog/rules.js';
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
const 상태차례 = ['정식', '미확정', '보류', '모킹'] as const;
type 상태 = (typeof 상태차례)[number];

// 앞에서부터 먼저 맞는 것 — 한 출처에 표시가 둘 적혀도 한 상태로 떨어지게
const 상태표시: [RegExp, 상태][] = [
  [/보류\s*[—–-]/, '보류'],
  [/화면 검사\s*[—–-]|화면에만\s*[—–-]|차이\s*D\d+/, '미확정'],
  [/모킹\s*[—–-]/, '모킹'],
];
const 기능축차례: Record<축, number> = { UI: 0, 정상: 1, 경계: 2, 예외: 3 };

// 문단 모드 번호는 글 속 자리일 뿐이라 개정판에서 엉뚱한 문단이 물려받는다 — 번호 모드 요구만 물려받는다
const 문단번호 = /^P\d*-\d+$/;

const 세자리 = (수: number) => String(수).padStart(3, '0');
const 축인가 = (글: string): 글 is 축 => (축차례 as readonly string[]).includes(글);
const 제거한줄 = (줄: 표줄) => 줄.tcId.startsWith('제거함(');

/** 기준(main) 표 줄을 알아보는 열쇠 — 출처의 빈칸 수가 달라도 같은 줄이다 */
export function 기준줄열쇠(줄: Pick<표줄, 'tcId' | '출처'>): string {
  return `${줄.tcId}|${줄.출처.trim().replace(/\s+/g, ' ')}`;
}

interface 덩이 {
  열쇠: string;
  요구: string;
  /** 1부터. 원장 밖 요구면 없다 */
  원장차례: number | undefined;
  갈래: 갈래;
  축: 축;
  상태: 상태;
  줄들: 표줄[];
}

/** 줄들을 칸으로 묶어 칸 차례로 돌려준다. 축이 넷 밖인 줄은 어긋남에 싣고 뺀다 */
function 덩이로묶기(줄들: 표줄[], 원장번호들: string[], 어긋남: string[]): 덩이[] {
  const 원장차례 = new Map<string, number>();
  원장번호들.forEach((번호, i) => {
    if (!원장차례.has(번호)) 원장차례.set(번호, i + 1);
  });
  const 칸들 = new Map<string, 덩이>();
  for (const 줄 of [...줄들].sort((가, 나) => 가.차례 - 나.차례)) {
    const 축 = 줄.축.trim();
    if (!축인가(축)) {
      어긋남.push(`요구 줄 ${줄.차례 + 1} 축 「${축}」 — UI · 정상 · 경계 · 예외 중 하나가 아니다`);
      continue;
    }
    let 앞: { 요구: string; 원장차례: number } | undefined;
    for (const 번호 of 번호찾기(줄.출처).번호들) {
      const i = 원장차례.get(번호);
      if (i !== undefined && (앞 === undefined || i < 앞.원장차례)) 앞 = { 요구: 번호, 원장차례: i };
    }
    const 요구 = 앞?.요구 ?? `#${줄.차례}`;
    const 갈래: 갈래 = 축 === 'UI' ? 'UI' : 'FN';
    const 상태 = 상태표시.find(([식]) => 식.test(줄.출처))?.[1] ?? '정식';
    const 열쇠 = `${요구}|${갈래}|${축}|${상태}#0`;
    const 칸 = 칸들.get(열쇠) ?? { 열쇠, 요구, 원장차례: 앞?.원장차례, 갈래, 축, 상태, 줄들: [] };
    칸.줄들.push(줄);
    칸들.set(열쇠, 칸);
  }
  const 수 = (d: 덩이) => d.원장차례 ?? Number.MAX_SAFE_INTEGER;
  return [...칸들.values()].sort(
    (가, 나) =>
      수(가) - 수(나) ||
      축차례.indexOf(가.축) - 축차례.indexOf(나.축) ||
      상태차례.indexOf(가.상태) - 상태차례.indexOf(나.상태),
  );
}

const 물려받는가 = (d: 덩이) => d.원장차례 !== undefined && !문단번호.test(d.요구);

/** 기준 표 줄로 칸 재료를 만든다 — (칸, 덩이)마다 그 덩이 첫 줄 tcId. 한 번호를 두 덩이에 주지 않는다 */
export function 칸재료만들기(접두사: string, 기준줄들: 표줄[], 쓰인: Iterable<string>, 원장번호들: string[]): 칸재료 {
  const 칸: Record<string, string> = {};
  const 준번호 = new Set<string>();
  for (const d of 덩이로묶기(기준줄들.filter((줄) => !제거한줄(줄)), 원장번호들, [])) {
    const 첫 = d.줄들[0]?.tcId ?? '';
    if (!물려받는가(d) || !TCID.test(첫) || tcId종류(첫) !== d.갈래 || 준번호.has(번호열쇠(첫))) continue;
    칸[d.열쇠] = 첫;
    준번호.add(번호열쇠(첫));
  }
  return {
    접두사,
    기준줄: 기준줄들.filter((줄) => TCID.test(줄.tcId)).map(기준줄열쇠),
    칸,
    쓰인: [...new Set(쓰인)].sort(),
  };
}

/** 줄마다 가져야 할 tcId. 판정은 칸 차례로 해서 줄 배열 순서가 결과를 바꾸지 않는다 */
export function 칸번호(원장번호들: string[], 줄들: 표줄[], 재료: 칸재료): 칸결과 {
  const 어긋남: string[] = [];
  const { 접두사 } = 재료;
  const n = 원장번호들.length;
  const 끝: Record<갈래, number> = { UI: n, FN: 3 * n };
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
  for (const d of 덩이들) {
    const 물려 = 재료.칸[d.열쇠];
    if (물려받는가(d) && 물려 !== undefined) 정하기(d, 물려);
  }
  for (const d of 덩이들) {
    if (번호.has(d) || d.상태 !== '정식' || d.원장차례 === undefined) continue;
    const i = d.원장차례;
    const 고정 =
      d.갈래 === 'UI' ? `${접두사}-UI-${세자리(i)}` : `${접두사}-FN-${세자리((i - 1) * 3 + 기능축차례[d.축])}`;
    if (!잡힌.has(번호열쇠(고정))) 정하기(d, 고정);
  }
  const 다음: Record<갈래, number> = { ...끝 };
  for (const d of 덩이들) {
    if (번호.has(d)) continue;
    다음[d.갈래] += 1;
    번호.set(d, `${접두사}-${d.갈래}-${세자리(다음[d.갈래])}`);
  }
  const 기대 = new Map<number, string>();
  for (const [d, tcId] of 번호) for (const 줄 of d.줄들) 기대.set(줄.차례, tcId);
  return { 기대, 어긋남, 알림: [] };
}
