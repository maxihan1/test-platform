// 반영 때 겹침의 프로시저 몫 — 프로시저 번호 겹침에 새 번호 주기 · 절의 케이스 번호 · 프로시저 번호 바꾸기 (도메인/작성 §3.6 「★ 테스트 프로시저 작성」 「반영 때 겹침」 · 「프로시저 번호 겹침 · 절 합치기」)
// 순수 함수다. 프로시저 번호는 참조로 저장하는 곳이 없어 사람에게 묻지 않고 에이전트가 정한다

import ts from 'typescript';

import { 프로시저글읽기 } from '../apps/admin/src/catalog/procedure.js';
import { 파일프로시저번호 } from '../apps/admin/src/authoring/procFile.js';
import { 백틱벗기기, 칸채우기, 표읽기 } from './authoring-md-table.js';
import { 절번호들, 절제목, 절줄들 } from './authoring-proc-table.js';

const 번호꼴 = /^(.+)-TP-(\d{3})$/;

/** 같은 머리의 가장 큰 프로시저 번호 다음. 999 를 넘으면 null — 파일 이름 규칙이 세 자리다 */
export function 다음프로시저번호(쓴: ReadonlySet<string>, 머리: string): string | null {
  const 큰 = Math.max(0, ...[...쓴].map((n) => { const m = 번호꼴.exec(n); return m?.[1] === 머리 ? Number(m[2]) : 0; }));
  return 큰 >= 999 ? null : `${머리}-TP-${String(큰 + 1).padStart(3, '0')}`;
}

/** 파일 경로 · 절에 쓰인 프로시저 번호 — 새 번호는 이것의 가장 큰 것 다음이다 */
export function 쓴프로시저번호(파일들: readonly string[], 표들: readonly string[]): Set<string> {
  return new Set([...파일들.flatMap((f) => 파일프로시저번호(f) ?? []), ...표들.flatMap(절번호들)]);
}

/** defineProcedure 의 procId 리터럴만 바꾼다 — 절차 제목 속 같은 글자는 안 건드린다. 못 찾으면 null */
export function 프로시저번호바꾸기(글: string, 옛: string, 새: string): string | null {
  const 읽은 = 프로시저글읽기(글);
  const 칸 = 읽은?.인자?.properties.find((p): p is ts.PropertyAssignment => ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === 'procId');
  const 값 = 칸?.initializer;
  if (읽은 === null || 값 === undefined || !ts.isStringLiteralLike(값) || 값.text !== 옛) return null;
  const 시작 = 값.getStart(읽은.sf);
  const 따옴표 = 글.slice(시작, 시작 + 1);
  return `${글.slice(0, 시작)}${따옴표}${새}${따옴표}${글.slice(값.end)}`;
}

/** 절의 프로시저 칸이 옛 번호인 줄만 새 번호로 */
export function 절프로시저바꾸기(표: string, 옛: string, 새: string): string {
  return 칸채우기(표, 절제목, '프로시저', new Map(절줄들(표).flatMap((줄) => (줄.프로시저 === 옛 ? [[줄.차례, 새] as const] : []))));
}

/** 절의 케이스 칸 안 그 케이스 번호만 새 번호로 — 칸에는 번호가 여럿이라 칸째 견주는 표 바꾸기로는 안 바뀐다 */
export function 절케이스번호바꾸기(표: string, 옛: string, 새: string): string {
  // 앞뒤가 글자 · 숫자 · 붙임표면 다른 번호의 일부다(XQ-FN-1011 · MTA-TP-001 의 꼬리)
  const 자리 = new RegExp(`(?<![A-Za-z0-9-])${옛}(?![0-9])`, 'g');
  const 기대 = new Map<number, string>();
  표읽기(표, 절제목).forEach((행, 차례) => {
    const 칸 = 백틱벗기기(행['케이스'] ?? '');
    if (자리.test(칸)) 기대.set(차례, 칸.replace(자리, 새));
    자리.lastIndex = 0;
  });
  return 칸채우기(표, 절제목, '케이스', 기대);
}
