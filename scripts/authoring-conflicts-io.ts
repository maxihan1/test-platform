// 반영 때 겹침 읽기 — 서버 저장소의 git 객체만 읽어 겹침판을 만든다(작업 폴더를 안 연다) · 반영 길 · 끝내기 몸 · PR 본문 줄
// (SPEC 도메인/작성 §3.6 「★ 반영 때 겹침 검사」 「구현 세부」). 판단(겹침찾기 · 결정계산)은 authoring-conflicts · authoring-conflicts-apply 에 있다

import type { 결정, 겹침 } from '../apps/admin/src/authoring/conflicts.js';
import { 겹침찾기, 표tcId들, type 케이스글 } from './authoring-conflicts.js';
import { 반영커밋인가, 케이스tcId } from './authoring-held-apply.js';
import type { 깃손 } from './authoring-ledger-io.js';
import { 합칠까 } from './authoring-main-merge.js';

/** 자식이 남긴 커밋 사슬이 이보다 길 일은 없다 — 반영 한 번에 커밋이 둘(값 · 합침)이고 다시 반영하면 자식 커밋부터 다시 짓는다 */
const 거슬러상한 = 20;

/**
 * 자식이 끝낸 커밋 — PR 머리에서 에이전트의 반영 커밋(보류 값 · 겹침 처리 · main 합침)을 첫 부모로 거슬러 간 곳.
 * 다시 반영할 때 이 커밋부터 다시 지어야 한 번 적용한 결정이 같은 번호로 다시 적용된다. 못 읽으면 null
 */
export function 자식커밋찾기(깃: 깃손, 머리: string): string | null {
  let 지금 = 머리;
  for (let i = 0; i < 거슬러상한; i += 1) {
    const 본문 = 깃(['log', '-1', '--format=%B', 지금, '--']);
    if (!본문.ok) return null;
    if (!반영커밋인가(본문.낸것)) return 지금;
    const 부모 = 깃(['rev-parse', '--verify', '--quiet', `${지금}^1^{commit}`]);
    if (!부모.ok) return null;
    지금 = 부모.낸것.trim();
  }
  return null;
}

export interface 겹침판 {
  자식커밋: string;
  mainSha: string;
  /** main 이 갈래점 뒤 이 서비스의 표나 테스트 폴더를 바꿨다 — 작업 폴더에서 main 을 합친다 */
  합칠까: boolean;
  겹침: 겹침[];
  /** 지금 main 과 이 요청이 쓴 tc_id 전부(표의 「제거함」 포함) — 새 번호는 이것의 가장 큰 것 + 1 부터 */
  쓴번호: Set<string>;
}

const 줄들 = (글: string) => 글.split('\n').filter((f) => f !== '');

/** 서버 저장소에서 읽는다 — 머리와 mainSha 는 이미 받아 둔 것이어야 한다. `뺀것` 은 보류에서 「제거」한 tc_id */
export function 겹침판읽기(
  깃: 깃손,
  입력: { 머리: string; mainSha: string; 폴더: string; 표경로: string; 뺀것: Set<string> },
): 겹침판 | { 사유: string } {
  const { mainSha, 폴더, 표경로 } = 입력;
  const 자식 = 자식커밋찾기(깃, 입력.머리);
  if (자식 === null) return { 사유: 'PR 머리에서 자식이 끝낸 커밋을 못 찾았다' };
  const 바탕 = 깃(['merge-base', 자식, mainSha]);
  if (!바탕.ok) return { 사유: `main 과 갈라진 자리를 못 찾았다: ${바탕.까닭 ?? ''}` };
  const 갈래점 = 바탕.낸것.trim();
  const 폴더길 = `tests/${폴더}/`;
  const 목록 = (인자: string[]): string[] | null => {
    const r = 깃(인자);
    return r.ok ? 줄들(r.낸것) : null;
  };
  const 더한길 = 목록(['diff', '--name-only', '--no-renames', '--diff-filter=A', 갈래점, 자식, '--', 폴더길]);
  const main길 = 목록(['ls-tree', '-r', '--name-only', mainSha, '--', 폴더길]);
  const 새로온길 = 목록(['diff', '--name-only', '--no-renames', '--diff-filter=A', 갈래점, mainSha, '--', 폴더길]);
  const main바뀐 = 목록(['diff', '--name-only', 갈래점, mainSha]);
  if (더한길 === null || main길 === null || 새로온길 === null || main바뀐 === null) return { 사유: '바뀐 케이스 파일 목록을 못 읽었다' };

  // 없는 파일(표가 아직 없는 새 서비스)은 빈 글자다
  const 글 = (판: string, 길: string) => {
    const r = 깃(['show', `${판}:${길}`]);
    return r.ok ? r.낸것 : '';
  };
  const 케이스들 = (판: string, 길들: string[]): 케이스글[] =>
    길들.filter((f) => f.endsWith('.spec.ts')).map((file) => ({ file, 글: 글(판, file) }));
  const 더한 = 케이스들(자식, 더한길);
  const main케이스 = 케이스들(mainSha, main길);
  const 요청표 = 글(자식, 표경로);
  const main표 = 글(mainSha, 표경로);

  const 쓴번호 = new Set([...표tcId들(요청표), ...표tcId들(main표)]);
  for (const c of [...더한, ...main케이스]) {
    const id = 케이스tcId(c.글);
    if (id !== null) 쓴번호.add(id);
  }
  return {
    자식커밋: 자식,
    mainSha,
    합칠까: 합칠까(main바뀐, 표경로, 폴더),
    겹침: 겹침찾기({ 더한, main케이스, 새로들어온: new Set(새로온길), 요청표, main표, 표경로, 뺀것: 입력.뺀것 }),
    쓴번호,
  };
}

/** 집기 응답의 conflicts — 모양이 맞는 결정만. 서버가 이미 가뒀지만 에이전트도 남의 입력으로 읽는다 */
export function 결정들(v: unknown): { tcId: string; action: 결정 }[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((d: unknown) => {
    if (typeof d !== 'object' || d === null) return [];
    const { tcId, action } = d as { tcId?: unknown; action?: unknown };
    return typeof tcId === 'string' && (action === 'KEEP' || action === 'DROP') ? [{ tcId, action }] : [];
  });
}

/**
 * 반영을 어떻게 하나. 멈춤 — 고르지 않은 겹침이 있다. 작업방 — 바꿀 것(뺀다 · 번호 바꾸기) · 보류 값 · main 합치기 ·
 * PR 머리에 앞 반영 커밋이 있다(자식 커밋부터 다시 지어야 지금 결정과 맞는다) 가운데 하나. 그대로 — 지금처럼 PR 을 그대로 반영
 */
export function 반영길(입력: {
  겹침: 겹침[];
  결정: { tcId: string; action: 결정 }[];
  보류: boolean;
  합칠까: boolean;
  머리: string;
  자식커밋: string;
}): '멈춤' | '작업방' | '그대로' {
  const 고른 = new Map(입력.결정.map((d) => [d.tcId, d.action]));
  if (입력.겹침.some((c) => !고른.has(c.tcId))) return '멈춤';
  const 바꿀것 = 입력.겹침.some((c) => 고른.get(c.tcId) === 'DROP' || c.kinds.includes('TCID'));
  return 바꿀것 || 입력.보류 || 입력.합칠까 || 입력.머리 !== 입력.자식커밋 ? '작업방' : '그대로';
}

/** 겹침으로 멈춘 반영의 끝내기 — 서버가 목록을 받아 사람에게 고르게 한다. 수는 아직 안 고른 것 */
export function 겹침끝몸(겹침: 겹침[], 결정: { tcId: string; action: 결정 }[]): { status: 'FAILED'; error: string; result: { conflicts: 겹침[] } } {
  const 고른 = new Set(결정.map((d) => d.tcId));
  const 남은 = 겹침.filter((c) => !고른.has(c.tcId)).length;
  return { status: 'FAILED', error: `겹치는 케이스 ${String(남은)}건 — 케이스마다 고른 뒤 다시 반영한다`, result: { conflicts: 겹침 } };
}

/** PR 본문 끝의 「겹침 처리:」 줄을 하나로 — 다시 반영하면 앞 줄을 바꾼다 */
export function 본문처리줄(본문: string, 줄: string): string {
  const 남은 = 본문
    .split('\n')
    .filter((l) => !l.startsWith('겹침 처리:'))
    .join('\n')
    .trimEnd();
  return `${남은}\n\n${줄}\n`;
}
