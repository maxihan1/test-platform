// 케이스를 쓰고 PR 을 올리는 저장소를 가르고, 대상 저장소의 거울 · 사본 명령을 정하는 순수 함수 (도메인/작성 「케이스를 쓰고 PR 을 올리는 곳」 · 공통/6-인프라 「바뀔 모습」)
// 껍데기는 authoring-repo-io.ts · authoring-child.ts 다

import { join } from 'node:path';

import { 저장소자리 } from '../apps/admin/src/settings/testsRepo.js';
import type { 명령 } from './authoring-chain.js';
import { type 사본, 저장소이름 } from './authoring-copy.js';

/**
 * 한 건이 쓰는 저장소. 자기 저장소(Commander — 켠 체크아웃 `/repo`)면 `도구` 가 null 이고 지금까지의 길 그대로다.
 * 대상 저장소면 `원천` 은 에이전트가 둔 bare 거울이고, 사본에 Commander 도구(관문 · 검사 · kit)를 따로 얹는다
 */
export interface 쓸저장소 {
  /** `<소유자>/<이름>` */
  자리: string;
  /** 기준 main · PR 머리를 묻고 받고 diff 하는 로컬 저장소 */
  원천: string;
  /** 사본의 origin — push 가 가는 곳 */
  원격주소: string;
  /** 대상 저장소일 때 사본 트리에 풀 Commander 체크아웃과 그 GitHub main SHA */
  도구: { 원천: string; sha: string } | null;
}

/** 설정의 testsRepo 를 받았거나 못 받은 까닭. 꼴이 틀리면 그 서비스의 작성을 집지 않는다 */
export type 저장소설정 = { 자리: string } | { 사유: string };

export function 저장소고르기(prefix: string, 값: unknown): 저장소설정 {
  const 자리 = typeof 값 === 'string' ? 저장소자리(값) : null;
  if (자리 !== null) return { 자리 };
  return { 사유: `${prefix} 의 테스트 저장소 설정이 비었거나 https://github.com/<소유자>/<이름> 꼴이 아니다 (설정 화면에서 고친다)` };
}

/** 켠 체크아웃의 저장소인가. GitHub 이름은 대소문자를 안 가려서 낮춰 견준다 */
export function 자기저장소인가(자리: string, 원격주소: string): boolean {
  return 저장소이름(원격주소)?.toLowerCase() === 자리.toLowerCase();
}

/** 대상 저장소마다 하나 — 사본 바탕 아래 `repos/<소유자>/<이름>.git`. `보관훑기` 는 author-<번호> 만 보므로 안 지운다 */
export function 거울자리(바탕: string, 자리: string): string {
  const [소유자, 이름] = 자리.split('/') as [string, string];
  return join(바탕, 'repos', 소유자, `${이름}.git`);
}

/**
 * Commander 도구를 트리에 푼다 — archive 라 Commander git 이 사본에 안 남는다.
 * `-C` 로 부른다 — 맥에서 켠 자리가 worktree 면 `.git` 이 파일이다
 */
export function 도구풀기(도구: { 원천: string; sha: string }, 자리: 사본): 명령[] {
  const 묶음 = join(자리.뿌리, 'tools.tar');
  return [
    { 명령: 'git', 인자: ['-C', 도구.원천, 'archive', '--format=tar', '-o', 묶음, 도구.sha] },
    { 명령: 'tar', 인자: ['-xf', 묶음, '-C', 자리.트리] },
  ];
}

/** 트리에서 지울 Commander 것 — 남기면 Commander 의 TODO · DEMO 케이스가 대상 저장소 PR 에 섞인다 */
export const 도구에서뺄것 = ['tests', join('docs', 'cases')];

/**
 * 대상 저장소 사본의 git. 거울에서 bare 로 받아 origin 을 GitHub 로 돌리고 sha 를 받는다.
 * non-cone sparse 로 `/tests/` · `/docs/cases/` 만 트리에 푼다 — 나머지(대상 제품 코드)는 Commander 도구 자리와 겹친다
 */
export function 대상사본준비(자리: 사본, 거울: string, 원격주소: string, sha: string): 명령[] {
  const g = `--git-dir=${자리.git}`;
  return [
    { 명령: 'git', 인자: ['clone', '-q', '--bare', '--no-hardlinks', 거울, 자리.git] },
    { 명령: 'git', 인자: [g, 'remote', 'set-url', 'origin', 원격주소] },
    { 명령: 'git', 인자: [g, 'fetch', '-q', 'origin', sha] },
    { 명령: 'git', 인자: [g, 'config', 'core.sparseCheckout', 'true'] },
    { 명령: 'git', 인자: [g, 'config', 'core.sparseCheckoutCone', 'false'] },
    // 펼치지 않은 자리에 Commander 파일(package.json 같은)이 있다 — 끄면 git 이 그것을 대상 파일로 보고 「고쳤다」로 센다
    { 명령: 'git', 인자: [g, 'config', 'sparse.expectFilesOutsideOfPatterns', 'true'] },
  ];
}

/** `info/sparse-checkout` 의 글 */
export const 대상펼칠것 = '/tests/\n/docs/cases/\n';

/**
 * 대상 저장소 사본의 `info/exclude`. 트리의 Commander 파일은 대상 git 이 모르는 것이라 안 보이게 한다 —
 * 그래야 status · add · diff 가 tests/ · docs/cases/ 만 본다. node_modules 링크도 여기에 걸린다
 */
export const 대상사본제외 = '/*\n!/tests/\n!/docs/\n/docs/*\n!/docs/cases/\n';

/** 사본 트리에 푸는 명령 — 자기 저장소와 같다 (`사본준비` 의 마지막) */
export function 풀기(자리: 사본, sha: string): 명령 {
  return {
    명령: 'git',
    인자: [`--git-dir=${자리.git}`, `--work-tree=${자리.트리}`, '-c', 'core.hooksPath=/dev/null', 'checkout', '-q', '--detach', '-f', sha],
  };
}

/** 병합할 PR 이 설정의 저장소 것인가 — 저장소 칸을 바꾼 뒤 옛 저장소 PR 을 새 거울로 판정하지 않게 */
export function PR저장소거부사유(prUrl: string, 자리: string): string | null {
  const 저장소 = /^https:\/\/github\.com\/([\w.-]+\/[\w.-]+)\/pull\/\d+$/.exec(prUrl)?.[1];
  if (저장소 !== undefined && 저장소.toLowerCase() === 자리.toLowerCase()) return null;
  return `이 PR(${prUrl}) 은 설정의 테스트 저장소(${자리}) 것이 아니다 — 병합하지 않는다`;
}

/**
 * 스캐너 filePath 를 저장소 뿌리 기준 경로(`tests/<폴더>/…`)로. 서버 스캔은 받아 온 자리 기준(`<소유자>/<이름>/tests/<폴더>/…`)이고
 * 사본 · 옛 서버는 테스트 뿌리 기준(`<폴더>/…`)이다. 테스트 폴더는 한 칸이라 옛 꼴이 `a/b/tests/…` 일 수 없다
 */
export function 저장소뿌리경로(filePath: string): string {
  const m = /^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+\/(tests\/.+)$/.exec(filePath);
  return m?.[1] ?? `tests/${filePath}`;
}
