// 작성 결과 일관성 — 같은 기획서로 여러 번 작성한 케이스 폴더를 견줘 얼마나 같은지 숫자로 낸다 (바뀐 부분만 다시 만들기 · 같은 입력이면 같은 결과의 기준선)
// 얇은 명령은 case-consistency.ts 다. 여기는 파일을 읽지 않는다

import { 케이스tcId } from './authoring-held-apply.js';
import { 표읽기 } from './authoring-ledger-check.js';
import { 가족, 가족하한, 번호찾기 } from './authoring-ledger.js';
import type { 파일글 } from './authoring-quality.js';

export interface 실행 {
  /** tcId → 확인 문장 */
  케이스: Map<string, Set<string>>;
  /** `pages/…` · `components/…` 마디부터의 경로 — 이름만 쓰면 둘 아래 같은 이름이 하나로 합쳐진다 */
  화면파일: Set<string>;
  /** tcId → 덮은 원장 번호. null 은 표 없음, 빈 Map 은 표는 있는데 원장 번호가 없음(화면만 작성) */
  덮음: Map<string, Set<string>> | null;
}

// 첫 인자가 문자열 글자일 때만 — 변수나 `${}` 가 든 템플릿은 실행마다 값이 달라 견줄 문장이 아니다
const 확인식 = /\bverify\(\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|`((?:[^`\\$]|\\.|\$(?!\{))*)`)/g;

/** 케이스 글의 `verify('<문장>', …)` 첫 인자들. 빈칸은 하나로 모아 글자 그대로 견준다 */
export function 확인문장들(글: string): string[] {
  return [...글.matchAll(확인식)].map((m) =>
    (m[1] ?? m[2] ?? m[3] ?? '')
      .replace(/\\(.)/g, '$1')
      .replace(/\s+/g, ' ')
      .trim(),
  );
}

/** 케이스 폴더 하나(와 그 요구사항 표)를 견줄 꼴로 줄인다. 파일 없는 tcId 는 덮은 것으로 치지 않는다 — 원장 대조 ⒜ 와 같다 */
export function 실행요약(파일들: 파일글[], 표?: string): 실행 {
  const 케이스 = new Map<string, Set<string>>();
  const 화면파일 = new Set<string>();
  for (const f of 파일들) {
    const 마디 = f.경로.split('/');
    const 자리 = 마디.findIndex((m) => m === 'pages' || m === 'components');
    if (자리 >= 0) 화면파일.add(마디.slice(자리).join('/'));
    if (!f.경로.endsWith('.spec.ts')) continue;
    const tcId = 케이스tcId(f.글);
    if (tcId !== null) 케이스.set(tcId, new Set(확인문장들(f.글)));
  }
  if (표 === undefined) return { 케이스, 화면파일, 덮음: null };

  // 파일이 있는 tcId 의 줄만 — 원장 대조 ⒜ 와 같다. 맞는 줄이 하나도 없으면 다른 서비스 표를 준 것이다
  const 줄들 = 표읽기(표, '요구사항')
    .map((줄) => ({ tcId: (줄['tcId'] ?? '').replace(/`/g, '').trim(), 번호들: 번호찾기(줄['출처'] ?? '').번호들 }))
    .filter((줄) => 케이스.has(줄.tcId));
  if (줄들.length === 0) throw new Error('표를 읽지 못했다 — 「## 요구사항」 절이 없거나 이 폴더의 tcId 와 맞는 줄이 없다');

  // 출처 칸에는 R18 근거(「화면 검사 — 날짜 ISO-8601」)나 다른 케이스 번호도 적힌다.
  // tcId 가족(MKT-FN)은 원장일 수 없고, 나머지는 원장 추출과 같은 하한으로 외톨이 가족을 거른다.
  // 가족 수는 「제외」 표까지 표 전체에서 센다 — 요구사항 표만 세면 대부분 제외된 가족(MKT 기준선 REQ-ADM)의 진짜 번호가 빠진다
  const tcId가족 = new Set([...케이스.keys()].map(가족));
  const 가족수 = new Map<string, Set<string>>();
  for (const 번호 of 번호찾기(표).번호들) 가족수.set(가족(번호), (가족수.get(가족(번호)) ?? new Set()).add(번호));
  const 원장번호 = (번호: string) => !tcId가족.has(가족(번호)) && (가족수.get(가족(번호))?.size ?? 0) >= 가족하한;

  const 덮음 = new Map<string, Set<string>>();
  for (const 줄 of 줄들) {
    const 번호들 = 줄.번호들.filter(원장번호);
    if (번호들.length > 0) 덮음.set(줄.tcId, new Set([...(덮음.get(줄.tcId) ?? []), ...번호들]));
  }
  return { 케이스, 화면파일, 덮음 };
}

export interface 견줌 {
  케이스: [number, number];
  /** 확인 문장 전체 — 표의 결과 칸을 실행마다 AI 가 새로 써서 낮게 나온다(2026-10-04 MKT 6.7%). 「표현까지 같은가」다 */
  문장겹침: number | null;
  화면겹침: number | null;
  /** 원장 번호로 재는 셋. 두 표가 다 있고 원장 번호가 있을 때만 */
  원장: { 같은번호: number; 같은요구: number; 짝겹침: number | null; a만: number; b만: number } | '표 없음' | '원장 없음';
}

/** 겹친 수 ÷ 합친 수. 둘 다 비면 null — 0 으로 치면 「다르다」로 조용히 센다 */
function 자카드(a: Set<string>, b: Set<string>): number | null {
  const 겹침 = [...a].filter((x) => b.has(x)).length;
  const 합 = a.size + b.size - 겹침;
  return 합 === 0 ? null : 겹침 / 합;
}

const 모두 = (m: Map<string, Set<string>>) => new Set([...m.values()].flatMap((s) => [...s]));

/** 같은 tcId 에 같이 묶인 원장 번호 짝 — R15 묶기 판단만 견준다. 번호당 케이스 수는 묶인 상대가 달라도 같게 나와 착시였다(게이트 1) */
function 짝들(덮음: Map<string, Set<string>>): Set<string> {
  const 짝 = new Set<string>();
  for (const 번호들 of 덮음.values()) {
    const 차례 = [...번호들].sort();
    차례.forEach((x, i) => 차례.slice(i + 1).forEach((y) => 짝.add(`${x}|${y}`)));
  }
  return 짝;
}

export function 견주기(a: 실행, b: 실행): 견줌 {
  const 바탕 = { 케이스: [a.케이스.size, b.케이스.size] as [number, number], 문장겹침: 자카드(모두(a.케이스), 모두(b.케이스)), 화면겹침: 자카드(a.화면파일, b.화면파일) };
  if (a.덮음 === null || b.덮음 === null) return { ...바탕, 원장: '표 없음' };
  if (a.덮음.size === 0 || b.덮음.size === 0) return { ...바탕, 원장: '원장 없음' };
  const [가, 나] = [a.덮음, b.덮음];

  // 두 실행에 다 있는 번호 가운데 한쪽이라도 원장 번호를 덮은 것만 — 둘 다 안 덮었으면 같은지 가릴 재료가 없다
  const 같은번호 = [...a.케이스.keys()].filter((t) => b.케이스.has(t) && (가.has(t) || 나.has(t)));
  const 같은요구 = 같은번호.filter((t) => (자카드(가.get(t) ?? new Set(), 나.get(t) ?? new Set()) ?? 0) >= 0.5).length;
  const [덮은가, 덮은나] = [모두(가), 모두(나)];
  return {
    ...바탕,
    원장: {
      같은번호: 같은번호.length,
      같은요구,
      짝겹침: 자카드(짝들(가), 짝들(나)),
      a만: [...덮은가].filter((x) => !덮은나.has(x)).length,
      b만: [...덮은나].filter((x) => !덮은가.has(x)).length,
    },
  };
}

// 재료가 없을 때 「없음」만 찍으면 「겹침이 없다(0%)」로 읽힌다 — 묶기가 전부 사라진 성공을 퇴보로 읽게 된다(코드 검토)
const 퍼센트 = (x: number) => `${(x * 100).toFixed(1)}%`;
const 비율 = (x: number | null, 재료: string) => (x === null ? ` — ${재료} 없음` : ` ${퍼센트(x)}`);

/** 두 실행을 견준 한 줄 — 명령이 짝마다 찍는다 */
export function 견줌줄(g: 견줌): string {
  const 원장 =
    typeof g.원장 === 'string'
      ? [`원장 숫자 ${g.원장}`]
      : [
          `같은 번호 같은 요구${g.원장.같은번호 === 0 ? ' — 같은 번호 없음' : ` ${String(g.원장.같은번호)} 중 ${String(g.원장.같은요구)}(${퍼센트(g.원장.같은요구 / g.원장.같은번호)})`}`,
          `묶인 번호 짝 겹침${비율(g.원장.짝겹침, '짝')}`,
          `한쪽만 덮은 번호 ${String(g.원장.a만)} · ${String(g.원장.b만)}`,
        ];
  return [`케이스 ${String(g.케이스[0])} · ${String(g.케이스[1])}`, ...원장, `확인 문장 겹침(표현까지)${비율(g.문장겹침, '문장')}`, `화면 파일 겹침${비율(g.화면겹침, '파일')}`].join(' | ');
}
