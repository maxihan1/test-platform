// 맥이 git·gh 를 어떻게 부를지 정하는 순수 함수. 껍데기(authoring-agent)는 여기서 받은 인자를 셸 없이 그대로 친다
//
// **셸 문자열이 아니라 인자 배열이다.** 요약·제목에 따옴표나 `$` 가 섞여도 해석될 자리가 없다.

import { join } from 'node:path';

/**
 * 작업방에 거는 `@platform/*` 심링크. `.claude/skills/tpx-start/SKILL.md` 의 목록과 **같은 값**이다 —
 * 검사가 그 파일을 읽어 대조한다. 안 걸면 모듈 찾기가 상위로 올라가 **사용자 체크아웃의 kit** 을 본다.
 */
export const 플랫폼링크 = [
  ['kit', '../../packages/kit'],
  ['admin', '../../apps/admin'],
  ['runner', '../../apps/runner'],
] as const;

export interface 명령 {
  명령: string;
  인자: string[];
}

/**
 * 자식 `claude -p` 의 환경. 자식은 셸 전체를 가지므로 `Bash(git:*)` 같은 이름 막기는 `/usr/bin/git`·`sh -c` 로
 * 비껴간다. **막는 것은 이 환경이다** — GitHub 자격증명이 없으면 push·PR·병합을 못 한다.
 * gh 는 `GH_TOKEN` 이 있으면 keychain 을 안 보므로 무효값으로 덮는다. `credential.helper` 를 빈 값으로 두면
 * 시스템 설정의 osxkeychain 까지 목록에서 지워진다.
 */
export function 자식환경(
  부모: Record<string, string | undefined>,
  빈gh설정폴더: string,
  피그마토큰?: string,
): Record<string, string | undefined> {
  // PARAMETERS 는 COUNT 보다 우선해 빈 credential.helper 를 덮을 수 있다
  const { SSH_AUTH_SOCK: _소켓, GIT_CONFIG_PARAMETERS: _설정, ...나머지 } = 부모;
  const 숫자 = /^\d+$/.test(부모.GIT_CONFIG_COUNT ?? '');
  // 셀 수 없으면 부모 것을 다 지우고 0 부터 — 남겨 두면 어느 번호가 살아 있는지 알 수 없다
  if (!숫자) for (const 키 of Object.keys(나머지)) if (/^GIT_CONFIG_(KEY|VALUE)_/.test(키)) delete 나머지[키];
  const 번째 = 숫자 ? Number(부모.GIT_CONFIG_COUNT) : 0;
  return {
    ...나머지,
    GH_TOKEN: 'authoring-child-has-no-github',
    GITHUB_TOKEN: 'authoring-child-has-no-github',
    GH_CONFIG_DIR: 빈gh설정폴더,
    GIT_CONFIG_COUNT: String(번째 + 1),
    [`GIT_CONFIG_KEY_${번째}`]: 'credential.helper',
    [`GIT_CONFIG_VALUE_${번째}`]: '',
    GIT_TERMINAL_PROMPT: '0',
    GIT_ASKPASS: '/usr/bin/false',
    SSH_ASKPASS: '/usr/bin/false',
    ...(피그마토큰 === undefined ? {} : { FIGMA_TOKEN: 피그마토큰 }),
  };
}

export function 올릴브랜치(번호: number): string {
  return `author-${번호}`;
}

/** 껍데기가 자식의 cwd·정리에 쓰는 자리. `작업방준비` 와 한 곳에서 나와야 치울 때 엉뚱한 곳을 안 본다 */
export function 작업방폴더(번호: number, 뿌리: string): string {
  return join(뿌리, '.claude', 'worktrees', 올릴브랜치(번호));
}

/**
 * 진짜 main 을 GitHub 에 묻는다. `refs/remotes/origin/main` 은 맥의 로컬 참조라 자식이 옮겨 놓으면
 * 판정·커밋수의 기준이 속는다. 껍데기는 이 SHA 를 `git fetch origin <sha>` 로 받아 두고 쓴다.
 */
export const 진짜main인자 = ['ls-remote', 'origin', 'refs/heads/main'];

/** ls-remote 출력에서 main SHA 를 뽑는다. 정확히 한 줄이 아니면 `null` — 지어내지 않는다 */
export function 진짜main풀기(낸것: string): string | null {
  const 줄들 = 낸것.split('\n').filter((줄) => 줄 !== '');
  if (줄들.length !== 1) return null;
  return /^([0-9a-f]{40})\trefs\/heads\/main$/.exec(줄들[0]!)?.[1] ?? null;
}

/**
 * 작업방 준비. 기준은 `진짜main인자` 로 받아 fetch 해 둔 SHA 다 — 로컬 `origin/main` 은 옛 판이거나 옮겨졌을 수 있다.
 * `--detach` 라 로컬 브랜치가 안 쌓이고 사용자 체크아웃의 HEAD·index 를 안 건드린다.
 */
export function 작업방준비(번호: number, 뿌리: string, 기준: string): 명령[] {
  const 폴더 = 작업방폴더(번호, 뿌리);
  const 링크자리 = join(폴더, 'node_modules', '@platform');
  return [
    { 명령: 'git', 인자: ['worktree', 'add', '--detach', 폴더, 기준] },
    { 명령: 'mkdir', 인자: ['-p', 링크자리] },
    ...플랫폼링크.map(([이름, 대상]) => ({ 명령: 'ln', 인자: ['-sfn', 대상, join(링크자리, 이름)] })),
  ];
}

export function 푸시인자(번호: number): string[] {
  return ['push', 'origin', `HEAD:refs/heads/${올릴브랜치(번호)}`];
}

export function 커밋메시지(번호: number, 서비스: string): string {
  return `[WS-작성] ${서비스} 작성 요청 ${번호}번 케이스`;
}

/**
 * 초안 PR 본문. 가벼운 길의 CI 는 새 케이스를 **실행하지 않는다** — 병합 근거는 맥의 관문 3 기록이라
 * 그 사실을 본문에 못박는다 (게이트 1 결정). 비밀값은 인자에 없으니 실릴 수가 없다.
 */
export function PR본문(입력: { 표: string; 요약: string }): string {
  const 절들: string[] = [];
  if (입력.표.trim() !== '') 절들.push(`## 요구사항 표\n\n${입력.표.trim()}`);
  if (입력.요약.trim() !== '') 절들.push(`## 작성 요약\n\n${입력.요약.trim()}`);
  절들.push('관문 3 의 3회 실행 결과가 병합 근거다 — 가벼운 길의 CI 는 새 케이스를 돌리지 않는다.');
  return 절들.join('\n\n');
}

export function PR만들기인자(번호: number, 제목: string, 본문: string): string[] {
  return ['pr', 'create', '--draft', '--base', 'main', '--head', 올릴브랜치(번호), '--title', 제목, '--body', 본문];
}

export function PR준비인자(prUrl: string): string[] {
  return ['pr', 'ready', prUrl];
}

/**
 * `gh pr merge` 에 거는 인자.
 *
 * **강제 깃발을 절대 안 붙인다** (CLAUDE.md §5 · `guard.mjs` 의 `isBanned()`).
 * 관리자 우회(`--admin`)도 안 쓴다 — main 보호가 `enforce_admins: false` 라 빨간 PR 병합을
 * 막는 것은 **맥의 CI 판정과 이 인자뿐**이다. GitHub 이 대신 막아 주지 않는다.
 *
 * `--match-head-commit` 으로 CI 를 판정한 그 커밋에 고정한다. 판정 뒤 누가 브랜치에 얹으면 GitHub 이 거부한다.
 */
export function 머지인자(prUrl: string, headSha: string): string[] {
  return ['pr', 'merge', prUrl, '--merge', '--delete-branch', '--match-head-commit', headSha];
}

/**
 * `CI판정` 이 읽는 칸과 **같은 목록**을 받는다. 한쪽만 바뀌면 판정이 늘 「아직」이 된다.
 * 브랜치는 PR 이 실제로 쓰는 이름(`headRefName`)이다 — 요청 번호로 지어 내면 PR 과 어긋날 때 남의 실행을 본다.
 */
export function 실행목록인자(브랜치: string): string[] {
  return [
    'run',
    'list',
    '--branch',
    브랜치,
    '--workflow',
    'ci',
    '--json',
    'headSha,status,conclusion,databaseId',
  ];
}

export interface CI실행 {
  headSha: string;
  status: string;
  conclusion: string | null;
  databaseId: number;
}

export type CI결과 =
  | { 판정: '아직' }
  | { 판정: '도는중'; 번호: number }
  | { 판정: '초록'; 번호: number }
  | { 판정: '빨강'; 번호: number; 이유: string };

/**
 * PR head SHA 의 **최신 `ci` 실행**으로 판정한다. `ci` 만 고르는 것은 `실행목록인자` 의 `--workflow ci` 한 곳이다.
 * 「실행 번호가 바뀌었나」로 보면 이미 Ready 인 PR 은 새 실행이 안 떠서 영원히 실패한다 (리뷰 BLOCKER 2). `success` 만 초록 — `cancelled`·`skipped`·
 * `timed_out`·null 을 초록으로 치면 안 돈 검사로 병합한다.
 *
 * `이후번호` 이하는 안 본다. 초안일 때 뜬 실행은 잡이 건너뛰어진 채 끝나 있어서, ready 직후 새 실행이
 * 뜨기 전에 읽으면 검사 없이 병합하거나 바로 실패로 닫는다.
 */
export function CI판정(headSha: string, 실행들: CI실행[], 이후번호 = 0): CI결과 {
  const 최신 = 실행들
    .filter((r) => r.headSha === headSha && r.databaseId > 이후번호)
    .reduce<CI실행 | null>((가장, r) => (가장 === null || r.databaseId > 가장.databaseId ? r : 가장), null);
  if (최신 === null) return { 판정: '아직' };
  if (최신.status !== 'completed') return { 판정: '도는중', 번호: 최신.databaseId };
  if (최신.conclusion === 'success') return { 판정: '초록', 번호: 최신.databaseId };
  return { 판정: '빨강', 번호: 최신.databaseId, 이유: String(최신.conclusion) };
}

/** 이미 Ready 인 PR 에 머지를 또 누르면 `pr ready` 가 새 실행을 안 만든다 — 빨간 그 실행을 다시 돌린다 */
export function 다시돌릴인자(이미준비됨: boolean, 결과: CI결과): string[] | null {
  if (!이미준비됨 || 결과.판정 !== '빨강') return null;
  return ['run', 'rerun', String(결과.번호)];
}

/**
 * 맥은 **테스트만 바뀐** 것만 올린다. 판정 규칙은 `.claude/scripts/cases-only.mjs` 가 정본이고
 * 껍데기가 그걸 명령줄로 불러 결과만 넘긴다 — 규칙을 여기 복사하면 둘이 어긋난다.
 */
export function 푸시거부사유(테스트만인가: boolean, 바뀐파일: string[]): string | null {
  if (바뀐파일.length === 0) return '바뀐 파일이 없다. 올릴 것이 없다.';
  if (테스트만인가) return null;
  return `테스트만 바뀐 것이 아니다 — 맥은 tests/**/*.spec.ts 와 docs/cases/*.md 만 올린다: ${바뀐파일.join(' · ')}`;
}

/**
 * 맥이 커밋한 **뒤에** 다시 본다. push 는 `HEAD` 라 `status` 로 본 것 말고 **자식이 몰래 만든 커밋**까지 올라간다.
 * 그래서 진짜 main SHA 와의 차이 전체를 판정하고, 커밋이 맥의 것 하나가 아니면 거부한다.
 */
export function 올린파일인자(기준: string): string[] {
  return ['-c', 'core.quotePath=false', 'diff', '--name-only', '--no-renames', `${기준}...HEAD`];
}
export function 커밋수인자(기준: string): string[] {
  return ['rev-list', '--count', `${기준}..HEAD`];
}

export function 커밋뒤거부사유(테스트만인가: boolean, 파일들: string[], 커밋수: number): string | null {
  if (커밋수 !== 1) {
    return `작업방의 커밋이 맥의 것 하나가 아니다 (${커밋수}개) — 자식이 커밋했다. 맥은 올리지 않는다.`;
  }
  return 푸시거부사유(테스트만인가, 파일들);
}

/**
 * 올릴 파일·PR 본문에 피그마 토큰이 들어갔나. 자식 환경에 토큰이 있어 케이스에 그대로 박을 수 있다.
 * 8자 미만은 안 본다 — 짧은 값은 아무 글에나 우연히 걸려 멀쩡한 것을 막는다.
 */
export function 비밀섞였나(글들: string[], 비밀: string | undefined): boolean {
  if (비밀 === undefined || 비밀.length < 8) return false;
  return 글들.some((글) => 글.includes(비밀));
}

/** 병합 직전에 PR 이 실제로 바꾼 파일. 올릴 때 판정했어도 그 뒤 누가 브랜치에 더 얹었을 수 있다 */
export function PR파일인자(prUrl: string): string[] {
  return ['pr', 'diff', prUrl, '--name-only'];
}

export function 머지거부사유(테스트만인가: boolean, 파일들: string[]): string | null {
  return 테스트만인가 && 파일들.length > 0 ? null : '이 PR 은 케이스만 바꾼 것이 아니다 — 맥은 병합하지 않는다';
}

/** 한 건 처리 중 튄 예외를 실패 보고 한 줄로. 안 닫으면 그 요청이 영원히 RUNNING 이다 */
export function 한줄(err: unknown): string {
  const 글 = err instanceof Error ? err.message : String(err);
  return `예상 못 한 오류: ${글.split('\n')[0]}`;
}

/** 훅이 막은 push 인가. 막힌 까닭은 다시 해도 같다 — 간격 두고 다시 하면 사람만 기다린다 */
export function 차단됐나(까닭: string): boolean {
  return 까닭.includes('[차단]');
}

/** push 실패를 `다시하며` 의 한 번 결과로. 시간 초과는 원격에 이미 닿았을 수 있어 다시 하면 겹친다 */
export function push실패(r: { 시간초과: boolean; 까닭: string; 오류: string }): { 까닭: string; 그만: boolean } {
  if (r.시간초과) return { 까닭: `${r.까닭} — 원격에 닿았을 수 있다 — PR 목록을 확인하라`, 그만: true };
  const 까닭 = 실패까닭(r.오류) || r.까닭;
  return { 까닭, 그만: 차단됐나(까닭) };
}

/** push 가 왜 실패했나. 첫 줄은 훅의 머리말이라 쓸모없다 — 훅의 `[차단]` 줄이 먼저, 없으면 git 의 마지막 두 줄 */
export function 실패까닭(stderr: string): string {
  const 줄들 = stderr.split('\n').filter((줄) => 줄.trim() !== '');
  const 차단 = 줄들.filter((줄) => 줄.includes('[차단]'));
  return (차단.length > 0 ? 차단 : 줄들.slice(-2)).join(' / ');
}

/** 켤 때 닫을 것. 남이 잡은 것은 그쪽이 아직 돌고 있을 수 있다 */
export function 닫을RUNNING(목록: { id: number; status: string; claimedBy?: string | null }[], 나: string): number[] {
  return 목록.filter((r) => r.status === 'RUNNING' && r.claimedBy === 나).map((r) => r.id);
}

/**
 * 작업방 상태(`status --porcelain -uall`)에서 바뀐 파일을 뽑는다. 자식은 커밋을 안 하므로
 * 새 파일은 추적되지 않은 채 남는다 — `diff` 만 보면 새 케이스를 통째로 놓친다.
 * 이름 바꾸기는 옛 자리도 낸다. 옛 자리가 지워진 것도 올려야 하고, 판정도 둘 다 봐야 한다.
 */
export function 바뀐파일들(상태글: string): string[] {
  return 상태글
    .split('\n')
    .filter((줄) => 줄.length > 3)
    .flatMap((줄) => 줄.slice(3).split(' -> '));
}

/** push 는 됐는데 PR 만들기가 실패했다 다시 도는 경우. 또 만들면 같은 브랜치에 PR 이 둘이 된다 */
export function PR찾기인자(번호: number): string[] {
  return ['pr', 'list', '--head', 올릴브랜치(번호), '--json', 'url'];
}

/** 빨간 CI 를 사람이 바로 열어 보게 실패 사유에 싣는 주소 */
export function CI실행주소(prUrl: string, 실행번호: number): string {
  const 저장소 = /^https:\/\/github\.com\/([\w.-]+\/[\w.-]+)\/pull\/\d+/.exec(prUrl)?.[1];
  return 저장소 === undefined ? `CI 실행 ${실행번호}번` : `https://github.com/${저장소}/actions/runs/${실행번호}`;
}

/**
 * 그 접두사의 기존 케이스가 사는 테스트 폴더. 모르면 `null`.
 *
 * **서비스의 테스트 폴더 설정은 서버 응답에 없다** — 더하면 계약 변경이라, 작업방의 기존 케이스로 찾기로 했다
 * (2026-09-23 사용자 결정). 없으면 첫 케이스는 사람이 `/tpx` 로 만든다 — 새 폴더는 어차피 가벼운 길이 아니라
 * 맥의 push 가 훅에 막힌다. 두 폴더에 흩어져 있으면 **고르지 않는다** (지어내지 않는다).
 */
export function 케이스폴더(파일목록: string[], 접두사: string): string | null {
  const 모양 = new RegExp(`^tests/([^/]+)/${접두사}-\\d{3}\\.spec\\.ts$`);
  const 폴더들 = new Set(파일목록.flatMap((f) => 모양.exec(f)?.[1] ?? []));
  return 폴더들.size === 1 ? [...폴더들][0]! : null;
}
