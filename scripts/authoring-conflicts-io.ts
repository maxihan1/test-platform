// 반영 때 겹침 읽기 — 서버 저장소의 git 객체만 읽어 겹침판을 만든다(작업 폴더를 안 연다) · 반영 길 · 끝내기 몸 · PR 본문 줄
// (SPEC 도메인/작성 §3.6 「★ 반영 때 겹침 검사」 「구현 세부」). 판단(겹침찾기 · 결정계산)은 authoring-conflicts · authoring-conflicts-apply 에 있다

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { 결정, 겹침 } from '../apps/admin/src/authoring/conflicts.js';
import { 결정계산, 처리줄 } from './authoring-conflicts-apply.js';
import { 겹침찾기, 표tcId들, type 케이스글 } from './authoring-conflicts.js';
import { 반영커밋인가, 보류있나, 케이스tcId } from './authoring-held-apply.js';
import { 겹침상한모양인가 } from '../apps/admin/src/authoring/conflicts.js';
import type { 반영준비 } from './authoring-held-merge.js';
import { type 보고손, type 칠때, 진짜main받기, 친다 } from './authoring-io.js';
import type { 깃손 } from './authoring-ledger-io.js';
import { 안전한파일, 합칠까 } from './authoring-main-merge.js';

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

// git 이 한글 · 특수 문자 이름을 따옴표로 감싸 내지 않게 -z 로 읽는다 — 감싼 이름은 파일을 못 찾아 겹침 검사를 건너뛴다
const 줄들 = (글: string) => 글.split('\0').filter((f) => f !== '');

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
  const 더한길 = 목록(['diff', '--name-only', '-z', '--no-renames', '--diff-filter=A', 갈래점, 자식, '--', 폴더길]);
  const main길 = 목록(['ls-tree', '-r', '--name-only', '-z', mainSha, '--', 폴더길]);
  const 새로온길 = 목록(['diff', '--name-only', '-z', '--no-renames', '--diff-filter=A', 갈래점, mainSha, '--', 폴더길]);
  const main바뀐 = 목록(['diff', '--name-only', '-z', 갈래점, mainSha]);
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
  const 겹침 = 겹침찾기({ 더한, main케이스, 새로들어온: new Set(새로온길), 요청표, main표, 표경로, 뺀것: 입력.뺀것 });
  // 서버가 끝내기 목록의 모양을 가둔다 — 모양이 틀린 줄이 하나라도 있으면 목록이 통째로 400 이라 사람이 고를 길도 없다
  const 틀림 = 겹침.find((c) => !겹침상한모양인가(c));
  if (틀림 !== undefined) return { 사유: `겹친 케이스의 번호나 이름 모양이 규칙과 다르다 — ${틀림.tcId}. 다시 작성한다` };
  return { 자식커밋: 자식, mainSha, 합칠까: 합칠까(main바뀐, 표경로, 폴더), 겹침, 쓴번호 };
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

/**
 * 반영 행을 가져왔을 때 겹침을 보고 길을 정한다. null 이면 이미 끝냈다(겹침으로 멈춤 · 못 읽음).
 * 서버 저장소에 받는 일(main · PR 머리)은 `줄`(한번에하나) 안에서 한다 — 둘이 겹치면 `.git` 잠금에서 한쪽이 죽는다.
 * 고치기 반영은 새 케이스를 안 더해 겹침이 없고 main 도 합치지 않는다 — 고친 파일이 겹치면 다시 적용이다
 */
export async function 겹침보기(
  손: 보고손,
  준비: 반영준비,
  머리: string,
  원천: string,
  호스트로: 칠때,
  줄: <T>(일: () => Promise<T>) => Promise<T>,
): Promise<{ 길: '그대로' | '작업방'; 판: 겹침판 | null } | null> {
  const held = 준비.것.held;
  const 보류 = 보류있나(held);
  if (준비.고치기) return { 길: 보류 ? '작업방' : '그대로', 판: null };
  if (준비.폴더 === null) {
    await 손.끝내기({ status: 'FAILED', error: `${준비.서비스} 의 테스트 폴더 설정을 못 받아 겹치는 케이스를 못 봤다` });
    return null;
  }
  const 폴더 = 준비.폴더;
  await 손.단계('겹치는 케이스를 보는 중');
  const 뺀것 = new Set(보류 ? Object.entries(held).filter(([, v]) => v.removed === true).map(([id]) => id) : []);
  const 읽음 = await 줄(async () => {
    const 메인 = 진짜main받기(원천, 호스트로);
    if ('까닭' in 메인) return { 사유: `최신 main 을 못 받아 겹치는 케이스를 못 봤다: ${메인.까닭}` };
    if (!친다('git', ['cat-file', '-e', `${머리}^{commit}`], 원천).ok) {
      // 서버 저장소에 쓰므로 호스트 계정으로 받는다 — root 로 받으면 사람이 git pull 을 못 한다
      const 받기 = 친다('git', ['fetch', 'origin', 머리], 원천, undefined, 120_000, 호스트로);
      if (!받기.ok) return { 사유: `PR 머리를 못 받았다: ${받기.까닭}` };
    }
    return 겹침판읽기((인자) => 친다('git', 인자, 원천), { 머리, mainSha: 메인.sha, 폴더, 표경로: `docs/cases/${준비.서비스}.md`, 뺀것 });
  });
  if ('사유' in 읽음) {
    await 손.끝내기({ status: 'FAILED', error: 읽음.사유 });
    return null;
  }
  const 결정 = 결정들(준비.것.conflicts);
  const 길 = 반영길({ 겹침: 읽음.겹침, 결정, 보류, 합칠까: 읽음.합칠까, 머리, 자식커밋: 읽음.자식커밋 });
  if (길 === '멈춤') {
    await 손.끝내기(겹침끝몸(읽음.겹침, 결정));
    return null;
  }
  return { 길, 판: 읽음 };
}

/** 작업 폴더에서 고른 대로 바꿀 글 — 보류 값을 적은 뒤의 트리를 읽는다. 쓰기 · 지우기는 부르는 쪽이 링크를 보고 한다 */
export function 겹침쓸것(
  트리: string,
  서비스: string,
  판: 겹침판,
  결정: { tcId: string; action: 결정 }[],
): { 쓰기: Map<string, string>; 지우기: string[]; 처리줄: string | null } | { 사유: string } {
  // 겹침은 자식이 끝낸 커밋에서 찾았고 작업 폴더도 그 커밋이다 — 없으면 트리가 어긋났다
  const 없는 = 판.겹침.filter((c) => !안전한파일(트리, c.file)).map((c) => c.tcId);
  if (없는.length > 0) return { 사유: `겹친 케이스 파일이 작업 폴더에 없거나 보통 파일이 아니다 — ${없는.join(' · ')}` };
  const 표 = join('docs', 'cases', `${서비스}.md`);
  const 표있나 = existsSync(join(트리, 표));
  if (표있나 && !안전한파일(트리, 표)) return { 사유: `요구사항 표가 보통 파일이 아니다 — ${표}` };
  const 요청표 = 표있나 ? readFileSync(join(트리, 표), 'utf8') : '';
  const r = 결정계산({ 겹침: 판.겹침, 결정, 읽기: (f) => readFileSync(join(트리, f), 'utf8'), 요청표, 쓴번호: 판.쓴번호 });
  if ('사유' in r) return r;
  const 쓰기 = new Map(r.쓰기.map((w) => [w.file, w.글]));
  if (표있나 && r.표 !== 요청표) 쓰기.set(표, r.표);
  return { 쓰기, 지우기: r.지우기, 처리줄: 처리줄(r.바뀐것) };
}
