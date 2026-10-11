// PRD 채점 — 정답지(데모마켓 정형 기획서의 REQ-*)를 기준으로 PRD · 케이스가 원본 요구를 얼마나 잡았는지 센다 (⑧ 일괄 시험 eval)
// 얇은 명령은 eval-prd.ts 다. 여기는 파일을 읽지 않는다

import type { PrdItem } from '@platform/kit/types';

import { 표읽기 } from './authoring-ledger-check.js';
import { 번호찾기 } from './authoring-ledger.js';
import { 오류추정줄인가 } from './authoring-slots.js';

export interface 정답 {
  전체: Set<string>;
  필수: Set<string>;
}

/** 정답지 기획서의 `| REQ-… |` 줄 — 측정표 §1 의 grep(`^| REQ-` · `필수 |$`)과 같은 줄을 센다. 끝 칸이 「필수」면 필수 */
export function 정답읽기(기획서: string): 정답 {
  const 전체 = new Set<string>();
  const 필수 = new Set<string>();
  for (const 줄 of 기획서.split(/\r?\n/)) {
    const 칸 = 줄.trim().split('|').map((c) => c.trim());
    if (!/^REQ-/.test(칸[1] ?? '') || !줄.trimStart().startsWith('|')) continue;
    전체.add(칸[1] ?? '');
    if (칸.at(-2) === '필수') 필수.add(칸[1] ?? '');
  }
  return { 전체, 필수 };
}

export interface 대응줄 {
  문장: string;
  번호들: string[];
}

/** 숨은 대응표의 `## 대응` 표(문장 · REQ). 비정형 기획서 문장마다 정답지 번호를 적는다 — 번호 없는 군더더기 문장은 REQ 칸이 「-」 */
export function 대응읽기(글: string): 대응줄[] {
  return 표읽기(글, '대응')
    .map((줄) => ({ 문장: 줄['문장'] ?? '', 번호들: 번호찾기(줄['REQ'] ?? '').번호들 }))
    .filter((줄) => 줄.문장.trim() !== '');
}

// 빈칸 · 문장부호 · 기호를 지운 글자만 견준다 — 근거는 원문 그대로라지만 줄바꿈 · 따옴표 · 가운뎃점은 옮기며 바뀐다
const 맨글자 = (글: string) => 글.replace(/[\s\p{P}\p{S}]/gu, '');
// 근거가 짧은 조각(「8자」)이면 아무 문장에나 들어가 엉뚱한 번호를 받는다. 대응 문장은 사람이 쓴 한 문장이라 짧아도 된다
const 근거최소 = 8;
const 대응최소 = 4;
function 같은문장(근거: string, 대응: string): boolean {
  return (근거.length >= 근거최소 && 대응.includes(근거)) || (대응.length >= 대응최소 && 근거.includes(대응));
}
// 규칙 하나인 항목이 정답 번호 셋 이상에 닿으면 근거가 문단을 통째로 옮겼을 수 있다 — 포착률이 부푼 만큼 숫자로 보인다
const 넓은닿음 = 3;

export interface 채점 {
  항목: number;
  확인필요: number;
  prd포착: Set<string>;
  /** 표를 안 줬으면 null */
  케이스포착: Set<string> | null;
  /** 근거에 적힌 REQ- 번호 중 정답지에 없는 것 */
  지어낸번호: string[];
  /** 어느 정답지 번호에도 안 닿는 PRD 번호 — 화면만 근거거나 대응표에 없는 문장 */
  안닿는항목: string[];
  /** 정답 번호 셋 이상에 닿는 PRD 번호 — 포착률이 부풀었을 수 있다 */
  넓은항목: string[];
  /** PRD 번호 → 정답지 번호들. case-consistency 의 세 번째 조각 */
  번호표: Map<string, string[]>;
}

/** PRD 항목들(지금 판)을 정답지와 견준다. 대응은 비정형 기획서일 때만, 표는 케이스 포착률을 볼 때만 */
export function 채점하기(항목들: PrdItem[], 정답: 정답, 대응: 대응줄[] = [], 표?: string): 채점 {
  const 대응글자 = 대응.map((줄) => ({ 글자: 맨글자(줄.문장), 번호들: 줄.번호들 }));
  const 번호표 = new Map<string, string[]>();
  const 지어낸 = new Set<string>();
  const 안닿는항목: string[] = [];
  for (const 항목 of 항목들) {
    const 닿음 = new Set<string>();
    for (const 근거 of 항목.basis) {
      for (const 번호 of 번호찾기(근거.ref ?? '').번호들) {
        if (정답.전체.has(번호)) 닿음.add(번호);
        // 피그마 화면 번호(MKT-HOME-01) 같은 다른 체계는 지어낸 것이 아니다
        else if (번호.startsWith('REQ-')) 지어낸.add(번호);
      }
      const 글자 = 맨글자(근거.quote);
      for (const 줄 of 대응글자) if (같은문장(글자, 줄.글자)) 줄.번호들.forEach((번호) => 닿음.add(번호));
    }
    const 정답안 = [...닿음].filter((번호) => 정답.전체.has(번호));
    if (정답안.length === 0) 안닿는항목.push(항목.reqId);
    else 번호표.set(항목.reqId, 정답안);
  }

  let 케이스포착: Set<string> | null = null;
  if (표 !== undefined) {
    케이스포착 = new Set();
    // 측정표 정의(만들어진 케이스가 가리키는 번호)대로 보류 줄도 센다 — 2026-10-05 4차 171/172 와 같은 셈.
    // 오류 추정 줄은 원장이 「덮음」으로 세지만(#200 남긴 것) 기획서 요구를 확인하지 않는다 — 포착률이 부풀지 않게 뺀다
    for (const 줄 of 표읽기(표, '요구사항')) {
      const 출처 = 줄['출처'] ?? '';
      if (오류추정줄인가(출처)) continue;
      for (const 번호 of 번호찾기(출처).번호들) {
        // 옛 표는 출처가 원본 번호 그대로다
        for (const 원본 of 번호표.get(번호) ?? (정답.전체.has(번호) ? [번호] : [])) 케이스포착.add(원본);
      }
    }
  }
  return {
    항목: 항목들.length,
    확인필요: 항목들.filter((항목) => 항목.status === 'NEEDS_CHECK').length,
    prd포착: new Set([...번호표.values()].flat()),
    케이스포착,
    지어낸번호: [...지어낸].sort(),
    안닿는항목,
    넓은항목: [...번호표].filter(([, 원본]) => 원본.length >= 넓은닿음).map(([번호]) => 번호),
    번호표,
  };
}

const 퍼센트 = (a: number, b: number) => (b === 0 ? '—' : `${((a / b) * 100).toFixed(1)}%`);
const 목록 = (번호들: string[]) =>
  번호들.length === 0 ? '없음' : 번호들.length <= 20 ? 번호들.join(' ') : `${번호들.slice(0, 20).join(' ')} 외 ${String(번호들.length - 20)}`;

/** 첫 줄은 숫자 한 줄, 뒤는 놓친 요구 · 지어낸 번호 목록 */
export function 채점줄(c: 채점, 정답: 정답): string[] {
  const 잡은수 = (잡음: Set<string>, 모음: Set<string>) => [...모음].filter((번호) => 잡음.has(번호)).length;
  const 포착 = (이름: string, 잡음: Set<string>) => {
    const [전체, 필수] = [잡은수(잡음, 정답.전체), 잡은수(잡음, 정답.필수)];
    return `${이름} ${String(전체)}/${String(정답.전체.size)}(${퍼센트(전체, 정답.전체.size)}) · 필수 ${String(필수)}/${String(정답.필수.size)}`;
  };
  const 놓침 = (잡음: Set<string>) => [...정답.전체].filter((번호) => !잡음.has(번호)).map((번호) => (정답.필수.has(번호) ? `${번호}(필수)` : 번호));
  const 줄들 = [
    [
      `PRD 항목 ${String(c.항목)} · 확인 필요 ${String(c.확인필요)}(${퍼센트(c.확인필요, c.항목)})`,
      포착('PRD 포착', c.prd포착),
      ...(c.케이스포착 === null ? [] : [포착('케이스 포착', c.케이스포착)]),
      `지어낸 원본 번호 ${String(c.지어낸번호.length)}`,
      `원본에 안 닿는 항목 ${String(c.안닿는항목.length)}`,
      `정답 셋 이상에 닿는 항목 ${String(c.넓은항목.length)}`,
    ].join(' | '),
    `PRD 가 놓친 요구: ${목록(놓침(c.prd포착))}`,
  ];
  if (c.케이스포착 !== null) 줄들.push(`케이스가 놓친 요구: ${목록(놓침(c.케이스포착))}`);
  if (c.지어낸번호.length > 0) 줄들.push(`지어낸 원본 번호: ${목록(c.지어낸번호)}`);
  if (c.넓은항목.length > 0) 줄들.push(`정답 셋 이상에 닿는 항목: ${목록(c.넓은항목)}`);
  return 줄들;
}
