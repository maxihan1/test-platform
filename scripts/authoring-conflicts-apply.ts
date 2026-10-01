// 겹친 케이스를 사람이 고른 대로 적용하는 순수 함수 — 남긴다(tc_id 가 겹칠 때만 새 번호) · 뺀다 · PR 본문 줄 (SPEC 도메인/작성 §3.6 「★ 반영 때 겹침 검사」)
// 껍데기(authoring-held-merge)가 작업 폴더에서 부른다. 여기는 I/O 가 없다. 케이스를 돌리지 않는다 — 번호 바꾸기 · 빼기는 동작을 안 바꾼다

import ts from 'typescript';

import type { 결정, 겹침 } from '../apps/admin/src/authoring/conflicts.js';
import { 명세글, 속성, 읽기 } from './authoring-held-apply.js';

/**
 * 같은 접두사의 가장 큰 번호 + 1 부터 `개수` 개. 999 를 넘으면 null — 파일 이름 규칙(cases-only 의 `-\d{3}`)이 세 자리다.
 * `쓴번호` 에 지운 번호(표의 「제거함」)까지 넣는다 — 다시 쓰면 옛 실행 이력이 새 케이스에 붙는다
 */
export function 다음번호(쓴번호: Set<string>, 접두사: string, 개수: number): string[] | null {
  const 꼴 = new RegExp(`^${접두사}-(\\d{3})$`);
  const 큰 = Math.max(0, ...[...쓴번호].map((id) => Number(꼴.exec(id)?.[1] ?? 0)));
  if (큰 + 개수 > 999) return null;
  return Array.from({ length: 개수 }, (_, i) => `${접두사}-${String(큰 + 1 + i).padStart(3, '0')}`);
}

/** defineCase 의 tcId 리터럴만 바꾼다 — 글자를 통째로 바꾸면 절차 제목 속 같은 번호까지 바뀐다 */
export function 번호바꾸기(글: string, 옛: string, 새: string): string {
  const 명세 = 명세글(읽기(글));
  const 값 = 명세 === undefined ? undefined : 속성(명세, 'tcId')?.initializer;
  if (값 === undefined || !ts.isStringLiteralLike(값) || 값.text !== 옛) return 글;
  const 따옴표 = 글.slice(값.getStart(), 값.getStart() + 1);
  return 글.slice(0, 값.getStart()) + `${따옴표}${새}${따옴표}` + 글.slice(값.end);
}

const 표줄인가 = (줄: string) => 줄.trimStart().startsWith('|');
const 칸들 = (줄: string) => 줄.split('|').map((c) => c.trim());

/** 표 줄의 그 tcId 칸만 새 번호로. 「제거함(…)」 칸과 표 밖 글은 안 건드린다 */
export function 표번호바꾸기(표: string, 옛: string, 새: string): string {
  return 표
    .split('\n')
    .map((줄) => (표줄인가(줄) ? 줄.split(`| ${옛} |`).join(`| ${새} |`) : 줄))
    .join('\n');
}

/** 그 tcId 칸을 가진 표 줄을 통째로 뺀다 — 「제거함」으로 남기면 main 의 같은 tc_id 줄과 섞인다 */
export function 표줄빼기(표: string, tcId: string): string {
  return 표
    .split('\n')
    .filter((줄) => !(표줄인가(줄) && 칸들(줄).includes(tcId)))
    .join('\n');
}

export type 바뀐것 = { 옛: string; 새: string } | { 옛: string; 뺌: true };

export interface 적용재료 {
  /** 에이전트가 새로 찾은 겹침 목록 */
  겹침: 겹침[];
  /** 원본의 결정 전부 — 목록 밖은 무시한다 */
  결정: { tcId: string; action: 결정 }[];
  /** 작업 폴더의 케이스 파일 글 */
  읽기: (file: string) => string;
  /** 작업 폴더의 요구사항 표. 없으면 빈 글자 */
  요청표: string;
  /** 지금 main 과 이 요청이 쓴 tc_id 전부 — 케이스 파일 · 표(「제거함」 포함) */
  쓴번호: Set<string>;
}

export interface 적용결과 {
  쓰기: { file: string; 글: string }[];
  지우기: string[];
  표: string;
  바뀐것: 바뀐것[];
}

/**
 * 고른 대로 바꿀 파일 · 표 · 처리 기록. tcId 차례로 번호를 준다 — 같은 판(같은 main · 같은 자식 커밋)이면
 * 다시 계산해도 같은 번호가 나와 CI 빨강 뒤 다시 반영해도 번호가 안 바뀐다
 */
export function 결정계산(재료: 적용재료): 적용결과 | { 사유: string } {
  const 고른 = new Map(재료.결정.map((d) => [d.tcId, d.action]));
  const 모자람 = 재료.겹침.filter((c) => !고른.has(c.tcId));
  if (모자람.length > 0) return { 사유: `겹치는 케이스 ${String(모자람.length)}건 — 케이스마다 고른 뒤 다시 반영한다` };

  const 차례 = [...재료.겹침].sort((a, b) => a.tcId.localeCompare(b.tcId));
  const 바꿀 = 차례.filter((c) => 고른.get(c.tcId) === 'KEEP' && c.kinds.includes('TCID'));
  const 결과: 적용결과 = { 쓰기: [], 지우기: [], 표: 재료.요청표, 바뀐것: [] };
  const 남은번호 = new Map<string, string[]>();
  for (const 접두사 of new Set(바꿀.map((c) => c.tcId.replace(/-\d{3}$/, '')))) {
    const 번호들 = 다음번호(재료.쓴번호, 접두사, 바꿀.filter((c) => c.tcId.startsWith(`${접두사}-`)).length);
    if (번호들 === null) return { 사유: `${접두사} 의 새 번호가 999 를 넘는다 — 파일 이름 규칙이 세 자리다` };
    남은번호.set(접두사, 번호들);
  }

  for (const c of 차례) {
    if (고른.get(c.tcId) === 'DROP') {
      결과.지우기.push(c.file);
      결과.표 = 표줄빼기(결과.표, c.tcId);
      결과.바뀐것.push({ 옛: c.tcId, 뺌: true });
      continue;
    }
    if (!바꿀.includes(c)) continue;
    const 새 = 남은번호.get(c.tcId.replace(/-\d{3}$/, ''))?.shift();
    if (새 === undefined) return { 사유: `${c.tcId} 의 새 번호를 못 정했다` };
    const 이름 = c.file.split('/').pop() ?? '';
    const 새파일 = 이름.includes(c.tcId) ? `${c.file.slice(0, c.file.length - 이름.length)}${이름.replace(c.tcId, 새)}` : c.file;
    if (새파일 !== c.file) 결과.지우기.push(c.file);
    결과.쓰기.push({ file: 새파일, 글: 번호바꾸기(재료.읽기(c.file), c.tcId, 새) });
    결과.표 = 표번호바꾸기(결과.표, c.tcId, 새);
    결과.바뀐것.push({ 옛: c.tcId, 새 });
  }
  return 결과;
}

/** PR 본문에 더하는 줄 — 관문 3 기록이 옛 tc_id 를 가리키지 않게. 처리한 것이 없으면 null */
export function 처리줄(바뀐것: 바뀐것[]): string | null {
  if (바뀐것.length === 0) return null;
  return `겹침 처리: ${바뀐것.map((b) => ('새' in b ? `${b.옛} → ${b.새}` : `${b.옛} 뺌`)).join(' · ')}`;
}
