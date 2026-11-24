// 보류 반영이 프로시저 파일 안 케이스 하나를 고치는 순수 함수 — 값 적기 · 케이스 걷기(선언 · cases 자리 · 구간 · 안 쓰는 import) · 케이스 목록 문서 절 고치기 (도메인/작성 §3.6 「★ 보류 케이스」 반영)
// 인쇄기로 다시 찍지 않고 원문을 잘라 낸다 — 다시 찍으면 다른 케이스의 줄까지 바뀐다

import ts from 'typescript';

import { 프로시저글읽기 } from '../apps/admin/src/catalog/procedure.js';
import { type 보류입력, 값적기, 번호글, 속성, 읽기 } from './authoring-held-apply.js';
import { 칸채우기, 표몸줄들 } from './authoring-md-table.js';
import { 절제목, 절줄들 } from './authoring-proc-table.js';

interface 자리 {
  시작: number;
  끝: number;
}

function 자르기(글: string, 자리들: 자리[]): string {
  return [...자리들].sort((a, b) => b.시작 - a.시작).reduce((acc, g) => acc.slice(0, g.시작) + acc.slice(g.끝), 글);
}

/**
 * 목록(배열 원소 · 이름 가져오기)에서 지울 원소들의 자리. 쉼표는 같이 걷는다 — 마지막이 지워지면 앞 원소 뒤 쉼표부터 걷는다.
 * 전부 지우면 첫 원소부터 마지막 원소까지 한 자리다
 */
function 원소자리(원소들: readonly ts.Node[], 지울: ReadonlySet<number>, sf: ts.SourceFile): 자리[] {
  const n = 원소들.length;
  let 꼬리 = n;
  while (꼬리 > 0 && 지울.has(꼬리 - 1)) 꼬리 -= 1;
  const 결과: 자리[] = [];
  for (let i = 0; i < 꼬리; i += 1) {
    if (지울.has(i)) 결과.push({ 시작: 원소들[i]!.getStart(sf), 끝: 원소들[i + 1]!.getStart(sf) });
  }
  if (꼬리 < n) 결과.push({ 시작: 꼬리 > 0 ? 원소들[꼬리 - 1]!.end : 원소들[0]!.getStart(sf), 끝: 원소들[n - 1]!.end });
  return 결과;
}

/** import 밖에서 쓰인 식별자 — 이름이 걷은 글에만 쓰였는지는 남은 글에서 이것으로 본다 */
function 쓴이름들(sf: ts.SourceFile): Set<string> {
  const 이름 = new Set<string>();
  const 걷기 = (n: ts.Node): void => {
    if (ts.isImportDeclaration(n)) return;
    if (ts.isIdentifier(n)) 이름.add(n.text);
    n.forEachChild(걷기);
  };
  걷기(sf);
  return 이름;
}

/**
 * 걷은 글에서 안 쓰게 된 import 를 지운다 — 루트 tsconfig 가 noUnusedLocals 라 남기면 반영의 타입 검사가 늘 실패한다.
 * 걷기 전에도 안 쓰던 이름은 둔다(내 일이 아니다). 부수 효과 import(`import 'x'`)도 둔다
 */
function 안쓰는가져오기(전: string, 후: string): string {
  const 전쓴 = 쓴이름들(읽기(전));
  const sf = 읽기(후);
  const 후쓴 = 쓴이름들(sf);
  const 사라짐 = (이름: string): boolean => 전쓴.has(이름) && !후쓴.has(이름);
  const 자리들: 자리[] = [];
  for (const 문 of sf.statements) {
    const 절 = ts.isImportDeclaration(문) ? 문.importClause : undefined;
    if (절 === undefined) continue;
    const 묶음 = 절.namedBindings;
    const 기본지움 = 절.name !== undefined && 사라짐(절.name.text);
    let 묶음지움 = false;
    if (묶음 !== undefined && ts.isNamespaceImport(묶음)) 묶음지움 = 사라짐(묶음.name.text);
    else if (묶음 !== undefined) {
      const 지울 = new Set(묶음.elements.flatMap((e, i) => (사라짐(e.name.text) ? [i] : [])));
      if (지울.size > 0 && 지울.size === 묶음.elements.length) 묶음지움 = true;
      else 자리들.push(...원소자리(묶음.elements, 지울, sf));
    }
    const 기본남음 = 절.name !== undefined && !기본지움;
    const 묶음남음 = 묶음 !== undefined && !묶음지움;
    if (!기본지움 && !묶음지움) continue;
    if (!기본남음 && !묶음남음) {
      const 뒤줄바꿈 = /^\r?\n/.exec(후.slice(문.end))?.[0].length ?? 0;
      자리들.push({ 시작: 문.getStart(sf), 끝: 문.end + 뒤줄바꿈 });
    } else if (기본지움) {
      자리들.push({ 시작: 절.name!.getStart(sf), 끝: 묶음!.getStart(sf) });
    } else {
      자리들.push({ 시작: 절.name!.end, 끝: 묶음!.end });
    }
  }
  return 자르기(후, 자리들);
}

/**
 * 프로시저 파일에서 tcId 케이스의 선언 · `cases` 자리 · `test.case` 구간을 걷는다. 마지막 케이스였으면 그 앞 준비 절차도 걷는다 —
 * 남기면 마지막 `test.case` 뒤 절차가 되어 K20 에 걸린다. 남은은 걷은 뒤 케이스 수(0 이면 파일을 지운다)
 */
export function 케이스걷기(글: string, tcId: string): { 글: string; 남은: number } | { 사유: string } {
  const 읽은 = 프로시저글읽기(글);
  if (읽은 === null) return { 사유: '프로시저 파일이 아니다' };
  if (읽은.구간 === null) return { 사유: '케이스 구간을 못 갈랐다 — 프로시저 파일의 K19 · K20 어긋남을 먼저 고쳐야 한다' };
  const sf = 읽은.sf;
  const 번째 = 읽은.구간.findIndex((c) => {
    const 값 = c.선언.declarationList.declarations.find((d) => ts.isIdentifier(d.name) && d.name.text === c.이름)?.initializer;
    const 인자 = 값 !== undefined && ts.isCallExpression(값) ? 값.arguments[0] : undefined;
    return 인자 !== undefined && ts.isObjectLiteralExpression(인자) && 번호글(인자) === tcId;
  });
  if (번째 < 0) return { 사유: '프로시저 파일에서 그 케이스의 선언을 못 찾았다' };
  const 구간 = 읽은.구간[번째]!;
  if (구간.선언.declarationList.declarations.length !== 1) return { 사유: `${구간.이름} 선언이 변수 여럿을 한 문에 선언해 그 케이스만 걷을 수 없다` };
  const cases = 읽은.인자 === undefined ? undefined : 속성(읽은.인자, 'cases')?.initializer;
  if (cases === undefined || !ts.isArrayLiteralExpression(cases)) return { 사유: 'defineProcedure 의 cases 배열을 못 찾았다' };
  const 원소번째 = cases.elements.findIndex((e) => ts.isIdentifier(e) && e.text === 구간.이름);
  if (원소번째 < 0) return { 사유: `cases 에서 ${구간.이름} 자리를 못 찾았다` };

  const 문자리 = (s: ts.Statement): 자리 => ({ 시작: s.getFullStart(), 끝: s.end });
  const 마지막 = 번째 === 읽은.구간.length - 1;
  const 걷을문 = [구간.선언, 구간.부름, ...(마지막 ? 구간.준비 : [])];
  const 걷은 = 자르기(글, [...걷을문.map(문자리), ...원소자리(cases.elements, new Set([원소번째]), sf)]);
  return { 글: 안쓰는가져오기(글, 걷은), 남은: 읽은.구간.length - 1 };
}

/** 케이스 목록 문서 「테스트 프로시저」 절의 그 번호가 든 줄에서 번호를 뺀다. 남은 번호가 없으면 줄을 지운다 */
export function 절케이스빼기(표글: string, tcId: string): string {
  const 줄들 = 절줄들(표글).filter((줄) => 줄.케이스.includes(tcId));
  if (줄들.length === 0) return 표글;
  const 남은 = (케이스: string[]) => 케이스.filter((t) => t !== tcId);
  const 고침 = new Map(줄들.flatMap((줄) => (남은(줄.케이스).length > 0 ? [[줄.차례, 남은(줄.케이스).join(' → ')] as const] : [])));
  const 글 = 칸채우기(표글, 절제목, '케이스', 고침);
  const 지울차례 = new Set(줄들.filter((줄) => 남은(줄.케이스).length === 0).map((줄) => 줄.차례));
  if (지울차례.size === 0) return 글;
  const 줄들글 = 글.split('\n');
  const 지울줄 = new Set(표몸줄들(줄들글, 절제목).flatMap((행, 차례) => (지울차례.has(차례) ? [행.줄] : [])));
  return 줄들글.filter((_, i) => !지울줄.has(i)).join('\n');
}

/**
 * 보류 케이스 하나를 반영한 글. 값은 그 번호의 선언에 적고, 제거는 프로시저 파일이면 그 케이스만 걷는다.
 * 지움 이 true 면 파일에 케이스가 안 남았다 — 옛 꼴 파일 제거도 그렇다
 */
export function 보류반영(글: string, tcId: string, 입력: 보류입력): { 글: string; 지움: boolean } | { 사유: string } {
  if (입력.removed !== true) {
    const r = 값적기(글, 입력, tcId);
    return '사유' in r ? r : { 글: r.글, 지움: false };
  }
  if (프로시저글읽기(글) === null) return { 글, 지움: true };
  const r = 케이스걷기(글, tcId);
  return '사유' in r ? r : { 글: r.글, 지움: r.남은 === 0 };
}
