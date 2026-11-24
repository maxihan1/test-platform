// 케이스와 요구 목록 맞춰 보기(관문 2) · 확인 하나에 값 하나 — 케이스 파일에서 맞춰 볼 문장을 읽는다. authoring-check.ts 가 300줄을 넘어 뗐다 (TP-F5-25)

import ts from 'typescript';

import { 명세글, 속성, 읽기 } from './authoring-held-apply.js';
import { type 모양지적, 문구모양, 코드모양 } from './authoring-case-shape.js';
import { 묶었나 } from './authoring-one-value.js';
import { 백틱벗기기, 표읽기 } from './authoring-md-table.js';
import { 케이스조각들 } from './authoring-proc-pieces.js';

export interface 케이스문장 {
  tcId: string;
  name: string | null;
  전제: string[];
  절차: string[];
  판정: string[];
  /** 실제 값을 배열 · 객체로 묶어 견주는 verify 의 문장 */
  묶은판정: string[];
  /** 기다림 · 케이스 안 화면 요소 · 문구 꼴 지적 (`authoring-case-shape.ts`) */
  모양: 모양지적[];
  /** 보류 사유 — 글자일 때만. 남은 보류 경고가 쓴다 */
  held?: string;
  /** 프로시저 안 케이스만 — 그 케이스 구간의 verify 문장(결과는 여기서 찾는다)과 같은 프로시저끼리 묶는 열쇠 */
  프로시저?: { 열쇠: string; 결과판정: string[] };
}

const 글자 = (n: ts.Node | undefined): string | null => (n !== undefined && ts.isStringLiteralLike(n) ? n.text : null);

/** 케이스 파일에서 맞춰 볼 문장 — `defineCase` 의 tcId · name · precondition, `test.step` 제목, `verify` 첫 인자. 글자가 아닌 것(템플릿 · 상수)은 못 읽어 빠진다 */
export function 케이스문장읽기(글: string): 케이스문장 | null {
  const sf = 읽기(글);
  const 명세 = 명세글(sf);
  const tcId = 명세 === undefined ? null : 글자(속성(명세, 'tcId')?.initializer);
  if (명세 === undefined || tcId === null) return null;
  const 전제식 = 속성(명세, 'precondition')?.initializer;
  const 절차: string[] = [];
  const 판정: string[] = [];
  const 묶은판정: string[] = [];
  const 훑기 = (n: ts.Node): void => {
    if (ts.isCallExpression(n)) {
      const 부름 = n.expression;
      const 첫 = 글자(n.arguments[0]);
      if (첫 !== null && ts.isPropertyAccessExpression(부름) && 부름.name.text === 'step' && 부름.expression.getText(sf) === 'test') 절차.push(첫);
      if (첫 !== null && ts.isIdentifier(부름) && 부름.text === 'verify') {
        판정.push(첫);
        if (n.arguments[1] !== undefined && 묶었나(n.arguments[1])) 묶은판정.push(첫);
      }
    }
    ts.forEachChild(n, 훑기);
  };
  훑기(sf);
  const held = 글자(속성(명세, 'held')?.initializer);
  const name = 글자(속성(명세, 'name')?.initializer);
  return {
    tcId,
    name,
    전제: 전제식 !== undefined && ts.isArrayLiteralExpression(전제식) ? 전제식.elements.flatMap((e) => 글자(e) ?? []) : [],
    절차,
    판정,
    묶은판정,
    모양: [...코드모양(sf), ...문구모양({ tcId, name, 판정 })],
    ...(held === null ? {} : { held }),
  };
}

/**
 * 파일 하나의 케이스 문장 전부 — 옛 꼴은 하나, 프로시저 파일은 케이스마다(`cases` 차례).
 * 프로시저 안 케이스의 전제는 프로시저의 precondition 과 그 케이스의 것, 조작은 준비 구간과 케이스 구간의 절차다 (작성 §3.6 「★ 테스트 프로시저 작성」 「관문」 2)
 */
export function 케이스문장들읽기(글: string): 케이스문장[] {
  return 케이스조각들(글).flatMap((c) => {
    const 문장 = 케이스문장읽기(c.글);
    if (문장 === null || c.프로시저 === undefined) return 문장 ?? [];
    const 결과판정 = 케이스문장읽기(c.프로시저.구간글)?.판정 ?? [];
    // 번호를 아직 안 매긴 프로시저도 파일 안 케이스끼리는 같은 묶음이다
    const 열쇠 = c.프로시저.procId ?? `파일:${케이스조각들(글)[0]?.tcId ?? c.tcId}`;
    return [{ ...문장, 전제: [...c.프로시저.전제, ...문장.전제], 프로시저: { 열쇠, 결과판정 } }];
  });
}

/** 확인 하나에 값 하나(`tpx-cases` `references/5-writing.md` 「확인 하나에 값 하나」) — `볼` 이 있으면 그 tcId 만 본다 */
export function 묶은확인들(케이스들: readonly 케이스문장[], 볼?: ReadonlySet<string>): string[] {
  const 볼것 = 케이스들.filter((c) => 볼 === undefined || 볼.has(c.tcId));
  return 볼것.flatMap((c) => c.묶은판정.map((문장) => `${c.tcId} 「${문장}」 — 값을 배열 · 객체로 묶어 견준다. 값마다 verify 를 따로 쓴다`));
}

const 칸 = (행: Record<string, string>, 이름: string) => (행[이름] ?? '').replace(/\\\|/g, '|').trim();

/**
 * 케이스와 요구 목록 맞춰 보기(관문 2) — 목록 기준 한 방향 글자 대조 (`tpx-cases` `references/6-gates.md` 「관문 2」).
 * 줄마다 전제 ∈ precondition · 조작 ∈ test.step 제목 · 결과 ∈ verify 문장, tcId 를 혼자 쓰는 줄은 name = 결과. 합친 케이스(R15)의 name 은 안 본다.
 * 결과 문장과 합친 이름은 서로 겹치면 안 된다. 케이스 파일이 없는 tcId 는 빠진 요구 검사 몫이라 건너뛴다. `볼` 이 있으면 그 tcId 만 본다(서브에이전트)
 */
export function 맞춰보기(표글: string, 케이스들: readonly 케이스문장[], 볼?: ReadonlySet<string>): string[] {
  const 케이스 = new Map(케이스들.map((c) => [c.tcId, c]));
  const 줄들 = 표읽기(표글, '요구사항').map((행) => ({ 번호: 칸(행, '요구'), 전제: 칸(행, '전제'), 조작: 칸(행, '조작'), 결과: 칸(행, '결과'), tcId: 백틱벗기기(칸(행, 'tcId')) }));
  const 몇줄 = new Map<string, number>();
  for (const 줄 of 줄들) 몇줄.set(줄.tcId, (몇줄.get(줄.tcId) ?? 0) + 1);
  const 틀림: string[] = [];
  for (const 줄 of 줄들) {
    const c = 케이스.get(줄.tcId);
    if (c === undefined || (볼 !== undefined && !볼.has(줄.tcId))) continue;
    const 머리 = `${줄.tcId} (목록 ${줄.번호}번째 줄)`;
    if (줄.전제 !== '' && !c.전제.includes(줄.전제)) 틀림.push(`${머리} 전제 「${줄.전제}」 — precondition 에 없다`);
    if (줄.조작 !== '' && !c.절차.includes(줄.조작)) 틀림.push(`${머리} 조작 「${줄.조작}」 — test.step 제목에 없다`);
    if (줄.결과 !== '' && !(c.프로시저?.결과판정 ?? c.판정).includes(줄.결과)) 틀림.push(`${머리} 결과 「${줄.결과}」 — ${c.프로시저 === undefined ? '' : '그 케이스의 test.case 구간 '}verify 문장에 없다`);
    if (몇줄.get(줄.tcId) === 1 && 줄.결과 !== '' && c.name !== 줄.결과) 틀림.push(`${머리} name 「${c.name ?? '(글자 아님)'}」 — 결과와 다르다`);
  }
  // 결과 문장 · 합친 이름이 겹치면 실행 목록과 증적에 같은 줄이 둘씩 뜬다 — 합친 케이스 안의 두 줄끼리도
  const 안겹침 = new Map<string, number>();
  for (const 줄 of 줄들) if (줄.결과 !== '' && 케이스.has(줄.tcId)) 안겹침.set(`${줄.tcId}\0${줄.결과}`, (안겹침.get(`${줄.tcId}\0${줄.결과}`) ?? 0) + 1);
  for (const [열쇠, 수] of 안겹침) {
    const [tcId, 문장] = 열쇠.split('\0') as [string, string];
    if (수 >= 2 && (볼 === undefined || 볼.has(tcId))) 틀림.push(`같은 케이스 안에서 결과 문장이 겹친다 「${문장}」 — ${tcId} ${수}줄`);
  }
  const 문장주인 = new Map<string, Set<string>>();
  const 더하기 = (문장: string, tcId: string) => 문장주인.set(문장, new Set([...(문장주인.get(문장) ?? []), tcId]));
  for (const 줄 of 줄들) if (줄.결과 !== '' && 케이스.has(줄.tcId)) 더하기(줄.결과, 줄.tcId);
  for (const [tcId, 수] of 몇줄) {
    const 이름 = 케이스.get(tcId)?.name;
    if (수 >= 2 && 이름) 더하기(이름, tcId);
  }
  const 보나 = (tcIds: Iterable<string>) => 볼 === undefined || [...tcIds].some((t) => 볼.has(t));
  for (const [문장, 주인] of 문장주인) {
    if (주인.size >= 2 && 보나(주인)) 틀림.push(`결과 문장이 겹친다 「${문장}」 — ${[...주인].sort().join(' · ')}`);
  }
  // 한 문장이 어디선 결과이고 어디선 준비 확인 판정이면 증적에서 「결과 FAIL」과 「전제 실행 중단」으로 갈린다 — 결과 쪽을 고친다.
  // 같은 프로시저 안에서는 걸지 않는다 — 앞 케이스의 결과가 뒤 케이스의 시작 상태인 것이 흐름이다 (작성 §3.6 「★ 테스트 프로시저 작성」 「관문」 2)
  const 결과들 = new Map<string, Set<string>>();
  for (const 줄 of 줄들) if (줄.결과 !== '') 결과들.set(줄.tcId, new Set([...(결과들.get(줄.tcId) ?? []), 줄.결과]));
  const 같은프로시저 = (c: 케이스문장, 주인: Set<string>) => c.프로시저 !== undefined && [...주인].some((t) => 케이스.get(t)?.프로시저?.열쇠 === c.프로시저?.열쇠);
  for (const [문장, 주인] of 문장주인) {
    const 준비쪽 = 케이스들.filter((c) => !주인.has(c.tcId) && c.판정.includes(문장) && !(결과들.get(c.tcId)?.has(문장) ?? false) && !같은프로시저(c, 주인)).map((c) => c.tcId);
    if (준비쪽.length > 0 && 보나([...주인, ...준비쪽])) 틀림.push(`결과 문장이 다른 케이스의 준비 판정이다 「${문장}」 — 결과 ${[...주인].sort().join(' · ')} · 준비 ${준비쪽.sort().join(' · ')} — 결과 쪽을 고친다`);
  }
  return 틀림;
}
