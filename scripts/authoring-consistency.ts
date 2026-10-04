// 작성 결과 일관성 — 같은 기획서로 여러 번 작성한 케이스 폴더를 견줘 얼마나 같은지 숫자로 낸다 (8·9번 기준선)
// 얇은 명령은 case-consistency.ts 다. 여기는 파일을 읽지 않는다

import { 케이스tcId } from './authoring-held-apply.js';
import { tcId꼴, 표읽기 } from './authoring-ledger-check.js';
import { 번호찾기 } from './authoring-ledger.js';
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

  const 덮음 = new Map<string, Set<string>>();
  for (const 줄 of 표읽기(표, '요구사항')) {
    const tcId = (줄['tcId'] ?? '').replace(/`/g, '').trim();
    const 번호들 = 번호찾기(줄['출처'] ?? '').번호들;
    if (!tcId꼴.test(tcId) || !케이스.has(tcId) || 번호들.length === 0) continue;
    const 모음 = 덮음.get(tcId) ?? new Set<string>();
    for (const 번호 of 번호들) 모음.add(번호);
    덮음.set(tcId, 모음);
  }
  return { 케이스, 화면파일, 덮음 };
}
