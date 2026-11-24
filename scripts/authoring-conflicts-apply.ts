// 겹친 케이스를 사람이 고른 대로 적용하는 순수 함수 — 남긴다(tc_id 가 겹칠 때만 새 번호) · 뺀다 · PR 본문 줄 (SPEC 도메인/작성 §3.6 「★ 반영 때 겹침 검사」)
// 껍데기(authoring-held-merge)가 작업 폴더에서 부른다. 여기는 I/O 가 없다. 케이스를 돌리지 않는다 — 번호 바꾸기 · 빼기는 동작을 안 바꾼다

import ts from 'typescript';

import type { 결정, 겹침 } from '../apps/admin/src/authoring/conflicts.js';
import { 파일프로시저번호, 프로시저파일인가 } from '../apps/admin/src/authoring/procFile.js';
import { 다음프로시저번호, 절케이스번호바꾸기, 절프로시저바꾸기, 프로시저번호바꾸기 } from './authoring-conflicts-proc.js';
import { 명세글, 속성, 읽기 } from './authoring-held-apply.js';

export type 번호꼴 = 'UI' | 'FN' | 'GS' | '옛';

/** tcId 를 번호열 머리 · 꼴 · 번호로 가른다. 번호 꼴이 아니면 null */
export function 번호열머리(tcId: string): { 머리: string; 꼴: 번호꼴; 번호: number } | null {
  const m = /^(.+?)-(?:(UI|FN|GS)-)?(\d{3})$/.exec(tcId);
  if (m === null) return null;
  return { 머리: m[1] ?? '', 꼴: m[2] === 'UI' || m[2] === 'FN' || m[2] === 'GS' ? m[2] : '옛', 번호: Number(m[3]) };
}

// FN 과 옛 꼴은 같은 번호열이다 — 같은 숫자를 두 번 쓰면 실행 이력이 섞인다. UI · GS 는 각자 따로 센다
const 같은열 = (가: 번호꼴, 나: 번호꼴) => (가 === 나) || (가 !== 'UI' && 가 !== 'GS' && 나 !== 'UI' && 나 !== 'GS');

/**
 * 같은 머리 · 같은 번호열의 가장 큰 번호 + 1 부터 `개수` 개를 `꼴` 로. 999 를 넘으면 null — 파일 이름 규칙(cases-only 의 `케이스파일꼴`)이 세 자리다.
 * `쓴번호` 에 지운 번호(표의 「제거함」)까지 넣는다 — 다시 쓰면 옛 실행 이력이 새 케이스에 붙는다
 */
export function 다음번호(쓴번호: Set<string>, 접두사: string, 개수: number, 꼴: 번호꼴 = '옛'): string[] | null {
  const 큰 = Math.max(
    0,
    ...[...쓴번호].map((id) => {
      const 갈래 = 번호열머리(id);
      return 갈래 !== null && 갈래.머리 === 접두사 && 같은열(갈래.꼴, 꼴) ? 갈래.번호 : 0;
    }),
  );
  if (큰 + 개수 > 999) return null;
  const 머리 = 꼴 === '옛' ? 접두사 : `${접두사}-${꼴}`;
  return Array.from({ length: 개수 }, (_, i) => `${머리}-${String(큰 + 1 + i).padStart(3, '0')}`);
}

/** defineCase 의 tcId 리터럴만 바꾼다 — 글자를 통째로 바꾸면 절차 제목 속 같은 번호까지 바뀐다. 프로시저 파일은 그 번호를 적은 선언만 */
export function 번호바꾸기(글: string, 옛: string, 새: string): string {
  const 명세 = 명세글(읽기(글), 옛);
  const 값 = 명세 === undefined ? undefined : 속성(명세, 'tcId')?.initializer;
  if (값 === undefined || !ts.isStringLiteralLike(값) || 값.text !== 옛) return 글;
  const 따옴표 = 글.slice(값.getStart(), 값.getStart() + 1);
  return 글.slice(0, 값.getStart()) + `${따옴표}${새}${따옴표}` + 글.slice(값.end);
}

const 표줄인가 = (줄: string) => 줄.trimStart().startsWith('|');
const 칸들 = (줄: string) => 줄.split('|').map((c) => c.trim());

/** 표 줄의 그 tcId 칸만 새 번호로. 「제거함(…)」 칸과 표 밖 글은 안 건드린다 */
export function 표번호바꾸기(표: string, 옛: string, 새: string): string {
  // 칸 단위로 본다 — 열 정렬로 공백이 다른 표나 다른 칸에 같은 글자가 든 줄에도 맞는다
  return 표
    .split('\n')
    .map((줄) =>
      표줄인가(줄)
        ? 줄
            .split('|')
            .map((칸) => (칸.trim() === 옛 ? ` ${새} ` : 칸))
            .join('|')
        : 줄,
    )
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
  /** 이 요청이 새로 더한 프로시저 파일 가운데 main 에 같은 번호가 있는 것 */
  프로시저겹침?: string[];
  /** 지금 main 과 이 요청이 쓴 프로시저 번호 전부 — 파일 · 절 */
  쓴프로시저?: Set<string>;
}

export interface 적용결과 {
  쓰기: { file: string; 글: string }[];
  지우기: string[];
  표: string;
  /** 케이스 번호만 — 끝내기 `mergedAs` 가 케이스 번호를 받는다 */
  바뀐것: 바뀐것[];
  /** 프로시저 번호 바꿈 — PR 본문 「겹침 처리」 줄에만 적는다 */
  프로시저바뀜: { 옛: string; 새: string }[];
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
  // 서버가 막지만 옛 결정이 남았을 수 있다 — 파일을 지우면 그 프로시저의 다른 케이스까지 사라진다
  const 못뺌 = 차례.filter((c) => 고른.get(c.tcId) === 'DROP' && 프로시저파일인가(c.file));
  if (못뺌.length > 0) return { 사유: `프로시저 안 케이스는 「새 케이스 제외」를 고를 수 없다 — ${못뺌.map((c) => c.tcId).join(' · ')}. 「둘 다 유지」로 고른 뒤 다시 반영한다` };
  const 바꿀 = 차례.filter((c) => 고른.get(c.tcId) === 'KEEP' && c.kinds.includes('TCID'));
  // 한 프로시저 파일에 바꿀 케이스가 여럿이다 — 앞 고침 위에 이어 적는다
  const 글들 = new Map<string, string>();
  const 지우기: string[] = [];
  const 결과: 적용결과 = { 쓰기: [], 지우기, 표: 재료.요청표, 바뀐것: [], 프로시저바뀜: [] };
  // 차례대로 하나씩 받아 쓴 것으로 더한다 — 옛 꼴과 FN 이 한 번호열을 나눠 써도 같은 숫자가 두 번 안 나온다
  const 쓴 = new Set(재료.쓴번호);
  for (const c of 차례) {
    if (고른.get(c.tcId) === 'DROP') {
      지우기.push(c.file);
      결과.표 = 표줄빼기(결과.표, c.tcId);
      결과.바뀐것.push({ 옛: c.tcId, 뺌: true });
      continue;
    }
    if (!바꿀.includes(c)) continue;
    const 갈래 = 번호열머리(c.tcId);
    if (갈래 === null) return { 사유: `${c.tcId} 의 새 번호를 못 정했다` };
    const 새 = 다음번호(쓴, 갈래.머리, 1, 갈래.꼴)?.[0];
    if (새 === undefined) return { 사유: `${c.tcId} 의 새 번호가 999 를 넘는다 — 파일 이름 규칙이 세 자리다` };
    쓴.add(새);
    const 이름 = c.file.split('/').pop() ?? '';
    const 새파일 = 이름.includes(c.tcId) ? `${c.file.slice(0, c.file.length - 이름.length)}${이름.replace(c.tcId, 새)}` : c.file;
    if (새파일 !== c.file) 지우기.push(c.file);
    글들.set(새파일, 번호바꾸기(글들.get(c.file) ?? 재료.읽기(c.file), c.tcId, 새));
    결과.표 = 절케이스번호바꾸기(표번호바꾸기(결과.표, c.tcId, 새), c.tcId, 새);
    결과.바뀐것.push({ 옛: c.tcId, 새 });
  }

  const 쓴프 = new Set(재료.쓴프로시저 ?? []);
  for (const file of [...(재료.프로시저겹침 ?? [])].sort()) {
    const 옛 = 파일프로시저번호(file);
    const 새 = 옛 === null ? null : 다음프로시저번호(쓴프, 옛.slice(0, 옛.lastIndexOf('-TP-')));
    if (옛 === null || 새 === null) return { 사유: `${file} 의 새 프로시저 번호를 못 정했다 — 세 자리(999)를 넘는다` };
    const 바꾼 = 프로시저번호바꾸기(글들.get(file) ?? 재료.읽기(file), 옛, 새);
    if (바꾼 === null) return { 사유: `${file} 에서 procId ${옛} 를 못 찾았다 — 다시 작성한다` };
    쓴프.add(새);
    글들.delete(file);
    글들.set(file.replace(`${옛}.spec.ts`, `${새}.spec.ts`), 바꾼);
    지우기.push(file);
    결과.표 = 절프로시저바꾸기(결과.표, 옛, 새);
    결과.프로시저바뀜.push({ 옛, 새 });
  }
  결과.쓰기 = [...글들].map(([file, 글]) => ({ file, 글 }));
  return 결과;
}

/** PR 본문에 더하는 줄 — 관문 3 기록이 옛 tc_id 를 가리키지 않게. 처리한 것이 없으면 null */
export function 처리줄(바뀐것: 바뀐것[], 프로시저바뀜: readonly { 옛: string; 새: string }[] = []): string | null {
  const 조각 = [...바뀐것.map((b) => ('새' in b ? `${b.옛} → ${b.새}` : `${b.옛} 뺌`)), ...프로시저바뀜.map((b) => `${b.옛} → ${b.새}`)];
  return 조각.length === 0 ? null : `겹침 처리: ${조각.join(' · ')}`;
}
