// 케이스 고치기(EDIT)를 main 사본의 글에 적는 순수 함수 — 기대값 · 확정 · 삭제와 PR 본문 줄 (도메인/작성 §3.6 「★ 케이스 고치기」)
// 껍데기(authoring-edit)가 부른다. 여기는 I/O 가 없다. 적는 장치는 보류 반영(authoring-held-apply)과 같은 것을 쓴다

import ts from 'typescript';

import { 값적기, 명세글, 사슬에서, 속성, 속성빼기, 읽기, 칸묶음, 케이스tcId, 표고치기 } from './authoring-held-apply.js';

/**
 * 어드민이 보낸 케이스 하나의 고칠 내용. 서버(apps/admin/src/authoring/edit.ts)가 이미 검사한 모양이다.
 * 서버 코드를 끌어오지 않고 여기 둔다 — 에이전트는 집은 JSON 만 받는다
 */
export type 기대값 = string | number | boolean;
export type 고칠것 = { tcId: string; delete: true } | { tcId: string; expected?: Record<string, 기대값>; confirm?: true };

interface 글파일 {
  경로: string;
  글: string;
}

/** unconfirmed 줄을 통째로 뺀다 — 화면에서 읽은 값을 정식 기대값으로 올리는 사람의 판단이다. 이미 없으면 같은 글 */
export function 확정하기(원문: string): { 글: string } | { 사유: string } {
  if (명세글(읽기(원문)) === undefined) return { 사유: 'defineCase({...}) 를 코드에서 못 찾았다' };
  return { 글: 속성빼기(원문, 'unconfirmed') };
}

export function 미확정사유(원문: string): string | null {
  const 명세 = 명세글(읽기(원문));
  const 값 = 명세 === undefined ? undefined : 속성(명세, 'unconfirmed')?.initializer;
  return 값 !== undefined && ts.isStringLiteralLike(값) ? 값.text : null;
}

/** expected 칸마다 지금 `.default(...)` 인자의 코드 글자 — 사람이 PR 에서 코드와 같은 모양으로 읽는다 */
export function 기대기본값들(원문: string): Record<string, string> {
  const sf = 읽기(원문);
  const 명세 = 명세글(sf);
  const 묶음 = 명세 === undefined ? undefined : 칸묶음(명세, 'expected');
  const 값들: Record<string, string> = {};
  for (const p of 묶음?.properties ?? []) {
    if (!ts.isPropertyAssignment(p) || !(ts.isIdentifier(p.name) || ts.isStringLiteral(p.name))) continue;
    const 인자 = 사슬에서(p.initializer, 'default')?.arguments[0];
    if (인자 !== undefined) 값들[p.name.text] = 인자.getText(sf);
  }
  return 값들;
}

/** 케이스 하나에 기대값을 적고 확정한다. 순서가 중요하다 — 확정 줄의 「지금 기대값」은 이번에 바꾼 뒤 값이다 */
function 케이스고치기(tcId: string, 원문: string, e: Exclude<고칠것, { delete: true }>): { 글: string; 줄들: string[] } | { 사유: string } {
  const 줄들: string[] = [];
  let 글 = 원문;
  const 기대 = e.expected ?? {};
  if (Object.keys(기대).length > 0) {
    const r = 값적기(글, { expected: 기대 });
    if ('사유' in r) return { 사유: `${tcId}: ${r.사유}` };
    const 옛 = 기대기본값들(글);
    const 새 = 기대기본값들(r.글);
    // 이미 그 값이면 줄을 안 낸다 — 다시 적용(재실행)이 새 main 에서 일부만 바꾸는 일이 있다
    for (const 칸 of Object.keys(기대)) if (옛[칸] !== 새[칸]) 줄들.push(`- ${tcId} 기대값 ${칸}: ${옛[칸] ?? '없음'} → ${새[칸] ?? '없음'}`);
    글 = r.글;
  }
  const 사유 = 미확정사유(글);
  if (e.confirm === true && 사유 !== null) {
    const r = 확정하기(글);
    if ('사유' in r) return { 사유: `${tcId}: ${r.사유}` };
    const 지금 = Object.entries(기대기본값들(글)).map(([칸, 값]) => `${칸}=${값}`);
    줄들.push(`- ${tcId} 확정 — 미확정 사유: ${사유} · 지금 기대값: ${지금.length > 0 ? 지금.join(', ') : '없음'}`);
    글 = r.글;
  }
  return { 글, 줄들 };
}

export const 고칠것없음 = '고칠 것이 이미 반영돼 있다';

/**
 * 고칠 것을 사본의 케이스 글에 적는다. `쓰기` 에는 바뀐 파일만 담는다.
 * 바뀐 것이 없으면 사유 — 빈 커밋은 실패하고, 실패 까닭이 사람에게 안 읽힌다
 */
export function 편집계산(
  케이스들: 글파일[],
  표: 글파일 | null,
  edits: 고칠것[],
): { 쓰기: Map<string, string>; 지우기: string[]; 줄들: string[] } | { 사유: string } {
  const 쓰기 = new Map<string, string>();
  const 지우기: string[] = [];
  const 줄들: string[] = [];
  for (const e of edits) {
    const 파일 = 케이스들.find((f) => 케이스tcId(f.글) === e.tcId);
    if (파일 === undefined) return { 사유: `${e.tcId} 케이스 파일을 못 찾았다` };
    if ('delete' in e) {
      지우기.push(파일.경로);
      줄들.push(`- ${e.tcId} 삭제`);
      continue;
    }
    const r = 케이스고치기(e.tcId, 쓰기.get(파일.경로) ?? 파일.글, e);
    if ('사유' in r) return r;
    if (r.글 !== 파일.글) 쓰기.set(파일.경로, r.글);
    else 쓰기.delete(파일.경로);
    줄들.push(...r.줄들);
  }
  const 제거 = edits.flatMap((e) => ('delete' in e ? [e.tcId] : []));
  if (표 !== null && 제거.length > 0) {
    const 고친 = 표고치기(표.글, 제거);
    if (고친 !== 표.글) 쓰기.set(표.경로, 고친);
  }
  if (쓰기.size === 0 && 지우기.length === 0) return { 사유: 고칠것없음 };
  return { 쓰기, 지우기, 줄들 };
}

/** 이 PR 은 관문 3(3회 실행)을 안 거친다 — 기대값이 기획 기준이면 지금 화면이 틀려 실패할 수 있고, 그 실패가 버그 신호다 */
export function 편집PR본문(줄들: string[]): string {
  return [
    `## 케이스 고치기\n\n${줄들.join('\n')}`,
    '어드민 화면에서 요청한 고치기다. 케이스를 돌리지 않고 타입 · 케이스 규칙 검사만 거쳤다 — CI 도 케이스를 돌리지 않는다. 병합 근거는 사람이 누른 「반영」이다.',
  ].join('\n\n');
}
