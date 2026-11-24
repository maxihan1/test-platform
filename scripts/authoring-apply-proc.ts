// 반영 계획에 싣는 프로시저(통째로 다시 쓸 파일)와 프로시저 안 케이스의 삭제 작성(params.procDelete)의 계획 · 프롬프트 · PR 머리 줄
// (도메인/작성 §3.6 「★ 테스트 프로시저 작성」 「고치기 · 삭제 · 보류 · 겹침」 「반영 · 이어 작성」). authoring-apply 가 300줄에 닿아 따로 둔다

import { lstatSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';

import type { 반영계획 } from './authoring-apply.js';
import { 경고줄 } from './authoring-design-check.js';
import { 케이스파일들 } from './authoring-progress.js';
import { 케이스조각들 } from './authoring-proc-pieces.js';

/** 기준(main) 판의 프로시저 파일 하나 — 케이스는 도는 차례대로 */
export interface 기준프로시저 {
  파일: string;
  procId: string;
  케이스: string[];
}

/** 이번 일이 닿는 프로시저 — 고칠 · 지울 밖의 케이스는 번호 · 기대값 · 확인 문장을 그대로 둔다 */
export interface 고칠프로시저 extends 기준프로시저 {
  고칠: string[];
  지울: string[];
}

/** 삭제 작성이면 지울 케이스들. 재실행 · 이어서 작성 행에는 서버가 원본 것을 물려 둔다. 칸이 있는데 모양이 틀리면 null */
export function 삭제요청읽기(것: { params?: unknown }): string[] | null | undefined {
  const d = (것.params as { procDelete?: unknown } | undefined)?.procDelete;
  if (d === undefined) return undefined;
  const cases = (d as { cases?: unknown } | null)?.cases;
  return Array.isArray(cases) && cases.length > 0 && cases.every((x): x is string => typeof x === 'string' && /^\S+$/.test(x)) ? [...new Set(cases)] : null;
}

/** 계획이 고치거나 지우는 케이스가 든 프로시저. 다시 쓰지 않는 종류의 케이스는 그대로 두므로 세지 않는다. 테스트 고침은 「수정 AI」 규칙이 따로다 */
export function 고칠프로시저들(계획: 반영계획, 기준: readonly 기준프로시저[]): 고칠프로시저[] {
  const 고칠 = new Set([
    ...계획.다시씀.flatMap((x) => x.케이스.filter((c) => x.다시쓸종류.includes(c.축)).map((c) => c.tcId)),
    ...계획.지움.flatMap((x) => x.남길케이스),
    ...(계획.화면이맞음 ?? []).flatMap((x) => [x.tcId, ...x.번호들.flatMap((n) => n.케이스.map((c) => c.tcId))]),
  ]);
  const 지울 = new Set([...계획.지움.flatMap((x) => x.지울케이스), ...(계획.삭제 ?? [])]);
  return 기준.flatMap((p): 고칠프로시저[] => {
    const 닿음 = { ...p, 고칠: p.케이스.filter((t) => 고칠.has(t) && !지울.has(t)), 지울: p.케이스.filter((t) => 지울.has(t)) };
    return 닿음.고칠.length + 닿음.지울.length > 0 ? [닿음] : [];
  });
}

/** 삭제 작성을 자식 없이 FAILED 로 끝낼 까닭 — 반영이 끝난 삭제를 다시 돌렸거나 그 사이 다른 반영이 걷었다 */
export function 삭제막힘(계획: 반영계획): string | null {
  if (계획.삭제 === undefined || (계획.프로시저 ?? []).some((p) => p.지울.length > 0)) return null;
  return `지울 케이스가 main 의 프로시저 파일에 없다(이미 지웠거나 옮겼다) — 이 요청은 폐기해도 된다: ${계획.삭제.slice(0, 10).join(' · ')}`;
}

/** 줄 프롬프트 반영 절의 프로시저 줄 — 삭제 작성 · 보통 반영 공통 */
export function 프로시저절(프로시저: readonly 고칠프로시저[]): string[] {
  if (프로시저.length === 0) return [];
  return [`고치거나 지울 케이스가 든 프로시저 ${String(프로시저.length)}개: ${프로시저.map((p) => p.procId).join(' · ')} — 케이스 하나만 고쳐도 그 프로시저 파일을 통째로 다시 쓰고 통째로 돌려 본다(apply.json 의 프로시저 · apply.md 「프로시저 안 케이스」).`];
}

/** 자식이 남긴 트리의 케이스 번호들 — 옛 꼴은 파일 이름도 센다(글을 못 읽어도 남은 파일이 보이게). 자식 폴더라 일반 파일만 읽는다 — 링크나 파이프를 심어 두면 트리 밖을 읽거나 멈춘다 */
export function 트리케이스들(트리: string, 폴더: string): Set<string> {
  const 자리 = join(트리, 'tests', 폴더);
  return new Set([...케이스파일들(자리)].map((p) => join(자리, p)).filter((p) => lstatSync(p).isFile()).flatMap((p) => [basename(p, '.spec.ts'), ...케이스조각들(readFileSync(p, 'utf8')).map((c) => c.tcId)]));
}

/** 닿은 프로시저에서 지울 것 말고 사라진 케이스 — 파일을 통째로 다시 쓰므로 다른 케이스가 같이 빠질 수 있다 */
export const 사라진케이스 = (계획: 반영계획, 있는: ReadonlySet<string>): string[] =>
  (계획.프로시저 ?? []).flatMap((p) => p.케이스.filter((t) => !p.지울.includes(t) && !있는.has(t)));

/** 삭제 작성의 PR 본문 머리 줄 — 지울 것이 남았거나 남길 것이 사라졌으면 사람이 반영 전에 본다 */
export function 삭제뒤줄(계획: 반영계획, 있는: ReadonlySet<string>): string[] {
  const 프로시저 = 계획.프로시저 ?? [];
  const 지울 = 프로시저.flatMap((p) => p.지울);
  return [
    `프로시저 안 케이스 삭제: ${String(지울.length)}건(${지울.join(', ')}) · 프로시저 ${프로시저.map((p) => p.procId).join(', ')}`,
    // 요청한 번호 전부로 본다 — main 의 프로시저에서 못 찾아 계획에 안 든 케이스가 다른 파일에 남아 있을 수 있다
    ...경고줄('지울 케이스가 남음', (계획.삭제 ?? []).filter((t) => 있는.has(t)), 10),
    ...경고줄('남길 케이스가 사라짐', 사라진케이스(계획, 있는), 10),
  ];
}
