// 작업마다 따로 만드는 사본 — 자식은 트리에만 쓰고 `.git` 은 자식 밖(에이전트만 쓰는 자리)에 둔다 (SPEC 도메인/작성 §3.6)
//
// **왜 worktree 가 아닌가** — `/repo` 의 worktree 는 `.git` 을 서버 저장소와 나눠 써서 자식이 훅·설정을 심을 수 있고,
// 두 건이 동시에 `worktree add`·`fetch` 하면 `/repo/.git` 잠금이 겹친다 (2026-09-24 게이트 0).

import { join } from 'node:path';

import type { 명령 } from './authoring-chain.js';

export interface 사본 {
  뿌리: string;
  /** bare. 에이전트만 쓴다 — 자식이 설정·훅을 못 심는다 */
  git: string;
  /** 자식이 쓰는 자리. `.git` 이 없다 */
  트리: string;
  /** 자식의 HOME. 작업마다 새로 — 앞 건이 남긴 전역 설정을 물려주지 않는다 */
  집: string;
  자료: string;
  gh: string;
}

export function 사본자리(번호: number, 바탕: string): 사본 {
  const 뿌리 = join(바탕, `author-${번호}`);
  return {
    뿌리,
    git: join(뿌리, 'git'),
    트리: join(뿌리, 'tree'),
    집: join(뿌리, 'home'),
    자료: join(뿌리, 'assets'),
    gh: join(뿌리, 'gh'),
  };
}

/** 죽은 채 남은 사본. 켤 때 지운다 — 도중에 꺼지면 `finally` 가 안 돈다 */
export function 남은사본(이름들: string[]): string[] {
  return 이름들.filter((이름) => /^author-\d+$/.test(이름));
}

/**
 * 원천(서버 저장소)에서 bare 로 받아 원격을 GitHub 로 돌리고, 진짜 main SHA 를 받아 트리에 푼다.
 * 원천에서 받는 것은 빨라서다(42MB) — 기준은 원천의 main 이 아니라 **GitHub 이 말하는 SHA** 다.
 */
export function 사본준비(자리: 사본, 원천: string, 원격주소: string, sha: string): 명령[] {
  const g = `--git-dir=${자리.git}`;
  return [
    { 명령: 'git', 인자: ['clone', '-q', '--bare', '--no-hardlinks', 원천, 자리.git] },
    { 명령: 'git', 인자: [g, 'remote', 'set-url', 'origin', 원격주소] },
    { 명령: 'git', 인자: [g, 'fetch', '-q', 'origin', sha] },
    {
      명령: 'git',
      인자: [g, `--work-tree=${자리.트리}`, '-c', 'core.hooksPath=/dev/null', 'checkout', '-q', '--detach', '-f', sha],
    },
  ];
}

/** 트리의 `node_modules` 는 원천 것을 가리키는 링크다. `.gitignore` 의 `node_modules/` 는 링크에 안 맞아 여기 적는다 */
export const 사본제외 = '/node_modules\n';

/**
 * 자식이 끝난 뒤 에이전트가 트리에서 치는 git·gh·판정의 환경.
 * **트리의 `.git` 을 절대 안 본다** — 자식이 만들어 두면 그 설정(fsmonitor·훅)이 에이전트 권한으로 돈다.
 * 그래서 push 때 pre-push 훅도 안 돈다. 같은 검사(타입·K1~K10)는 CI 의 가벼운 길이 한다
 */
export function 사본환경(자리: 사본): Record<string, string> {
  return {
    GIT_DIR: 자리.git,
    GIT_WORK_TREE: 자리.트리,
    GIT_CONFIG_COUNT: '2',
    GIT_CONFIG_KEY_0: 'core.hooksPath',
    GIT_CONFIG_VALUE_0: '/dev/null',
    GIT_CONFIG_KEY_1: 'core.fsmonitor',
    GIT_CONFIG_VALUE_1: 'false',
  };
}

export function 저장소이름(원격주소: string): string | null {
  return /github\.com[:/]([\w.-]+\/[\w.-]+?)(?:\.git)?$/.exec(원격주소)?.[1] ?? null;
}

export interface 파일모양 {
  경로: string;
  종류: '파일' | '링크' | '그밖' | '없음';
  /** realpath. 지워진 파일이면 null */
  실제: string | null;
}

/**
 * 에이전트(root)가 자식이 만든 파일을 읽기 전에 본다. 읽기는 링크를 따라간다 —
 * 자식이 `docs/cases/X.md` 를 `/proc/1/environ` 으로 링크하면 토큰이 PR 본문에 실린다 (2026-09-24 계획).
 * 마지막 이름만 보면 중간 폴더 링크가 새므로 실제 자리가 트리 안인지도 본다. FIFO 는 읽는 순간 멈춘다
 */
export function 파일거부사유(파일들: 파일모양[], 트리실제: string): string | null {
  const 나쁜것 = 파일들.filter(
    (f) => f.종류 !== '없음' && (f.종류 !== '파일' || f.실제 === null || !f.실제.startsWith(`${트리실제}/`)),
  );
  if (나쁜것.length === 0) return null;
  return `일반 파일이 아니거나 작업 트리 밖을 가리킨다 — 올리지 않는다: ${나쁜것.map((f) => f.경로).join(' · ')}`;
}
