// 한 건이 쓸 저장소를 정하는 껍데기 — 대상 저장소 거울 받기 · Commander 도구 SHA · 첫 PR 바탕 파일 쓰기 · 병합 전 검사 (도메인/작성 「케이스를 쓰고 PR 을 올리는 곳」)
// 판단은 authoring-repo.ts · authoring-repo-base.ts 의 순수 함수에 있다

import { chownSync, existsSync, mkdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import type { 계정, 사본 } from './authoring-copy.js';
import { 사본만들기, 사본치우기, 자식거두기 } from './authoring-child.js';
import { 검사실패글, 검사환경 } from './authoring-edit.js';
import { 도는번호 } from './authoring-keeping.js';
import { type 보고손, type 칠때, 돌린다, 진짜main묻기, 진짜main받기, 친다 } from './authoring-io.js';
import { type 쓸저장소, type 저장소설정, 거울자리, 자기저장소인가 } from './authoring-repo.js';
import { 바탕파일 } from './authoring-repo-base.js';

export type { 쓸저장소 } from './authoring-repo.js';

const 앞일 = new Map<string, Promise<unknown>>();

/**
 * 같은 거울에 치는 git 은 한 번에 하나. 처음 받기는 길어 비동기로 도는데, 그동안 다른 건이 같은 거울에 fetch 하면 잠금에서 한쪽이 죽는다.
 * 거울에 쓰는 일은 전부 이 줄로 — 병합의 기준 · 머리 받기도 대상 저장소면 이것을 줄로 쓴다(authoring-merge `한번에하나` 대신)
 */
export function 거울차례<T>(거울: string, 일: () => Promise<T>): Promise<T> {
  const 이번 = (앞일.get(거울) ?? Promise.resolve()).then(일, 일);
  앞일.set(거울, 이번.catch(() => undefined));
  return 이번;
}

/** 거울을 만들거나 origin 을 맞추고 GitHub main 을 받아 둔다. 호스트 uid 0700 — 자식 uid 는 못 읽고 못 쓴다 */
async function 거울받기(바탕: string, 저장소자리: string, 호스트로: 칠때, 호스트: 계정 | null): Promise<{ 거울: string } | { 까닭: string }> {
  const 거울 = 거울자리(바탕, 저장소자리);
  const 주소 = `https://github.com/${저장소자리}`;
  return 거울차례(거울, async () => {
    if (!existsSync(join(거울, 'HEAD'))) {
      // 위 폴더는 지나가기만(0711) — 다른 자리 자식이 저장소 목록을 못 본다
      mkdirSync(dirname(거울), { recursive: true, mode: 0o711 });
      mkdirSync(거울, { recursive: true, mode: 0o700 });
      if (호스트 !== null) chownSync(거울, 호스트.uid, 호스트.gid);
      const 만듦 = 친다('git', ['init', '-q', '--bare', 거울], '/', undefined, 60_000, 호스트로);
      if (!만듦.ok) return { 까닭: `${저장소자리} 거울을 못 만들었다: ${만듦.까닭}` };
    }
    const 원격 = 친다('git', ['--git-dir', 거울, 'config', 'remote.origin.url', 주소], '/', undefined, 60_000, 호스트로);
    if (!원격.ok) return { 까닭: `${저장소자리} 거울의 원격을 못 맞췄다: ${원격.까닭}` };
    const 메인 = 진짜main묻기(거울);
    if ('까닭' in 메인) return { 까닭: `${저장소자리}: ${메인.까닭} — 저장소가 없거나 비었거나 작성 계정에 권한이 없다` };
    if (친다('git', ['--git-dir', 거울, 'cat-file', '-e', `${메인.sha}^{commit}`], '/').ok) return { 거울 };
    // 처음 받기는 저장소 크기만큼 걸린다 — 동기로 치면 생존 신호가 끊긴다
    const 환경 = { ...(호스트로.env ?? process.env), GIT_TERMINAL_PROMPT: '0' };
    const 받기 = await 돌린다('git', ['--git-dir', 거울, 'fetch', '-q', 'origin', 메인.sha], { cwd: '/', env: 환경, uid: 호스트로.uid, gid: 호스트로.gid, 제한: 600_000 });
    if (받기.코드 !== 0) return { 까닭: `${저장소자리} main 을 못 받았다: ${받기.시간초과 ? '시간 초과' : (받기.오류.trim().split('\n').pop() ?? '')}` };
    // 가리키는 이름이 있어야 사본의 bare clone 이 그 객체를 같이 가져가고 gc 가 안 지운다
    친다('git', ['--git-dir', 거울, 'update-ref', 'refs/heads/main', 메인.sha], '/', undefined, 60_000, 호스트로);
    return { 거울 };
  });
}

/** 켤 때 정해 둔 것 가운데 저장소를 고르는 데 쓰는 것 */
export interface 저장소판 {
  바탕: string;
  원천: string;
  원격주소: string;
  계정: { 호스트: 계정 } | null;
  호스트로: 칠때;
}

/**
 * 한 건의 저장소. 설정이 틀렸거나 받지 못했으면 FAILED 로 끝내고 null.
 * 자기 저장소면 켤 때 것 그대로 — 지금까지의 길에서 한 글자도 안 바뀐다
 */
export async function 건저장소(판: 저장소판, 설정: 저장소설정, 손: 보고손): Promise<쓸저장소 | null> {
  const 실패 = async (까닭: string) => {
    await 손.끝내기({ status: 'FAILED', error: 까닭 });
    return null;
  };
  if ('사유' in 설정) return 실패(설정.사유);
  if (자기저장소인가(설정.자리, 판.원격주소)) return { 자리: 설정.자리, 원천: 판.원천, 원격주소: 판.원격주소, 도구: null };
  await 손.단계('테스트 저장소를 받는 중');
  const 받음 = await 거울받기(판.바탕, 설정.자리, 판.호스트로, 판.계정?.호스트 ?? null);
  if ('까닭' in 받음) return 실패(받음.까닭);
  // 관문 도구는 Commander 의 GitHub main 이다 — 맥 체크아웃이 다른 가지여도 서버 실행과 같은 도구로 돈다
  const 도구 = 진짜main받기(판.원천, 판.호스트로);
  if ('까닭' in 도구) return 실패(`Commander 도구를 못 정했다: ${도구.까닭}`);
  return { 자리: 설정.자리, 원천: 받음.거울, 원격주소: `https://github.com/${설정.자리}`, 도구: { 원천: 판.원천, sha: 도구.sha } };
}

/**
 * 첫 PR 바탕 파일 — 대상 저장소의 기준에 없는 것만 고정 글로 쓴다. 자식이 그 이름으로 무엇을 썼어도 덮는다(링크 · 폴더면 지우고).
 * 기준에 있는 것은 안 건드린다 — 자식이 바꿨으면 올리기의 `바탕파일거부사유` 가 거절한다
 */
export function 바탕파일쓰기(자리: 사본, 기준에있나: (경로: string) => boolean): { 쓴것: string[] } | { 까닭: string } {
  const 빈자리 = Object.keys(바탕파일).filter((f) => !기준에있나(f));
  if (빈자리.length === 0) return { 쓴것: [] };
  try {
    mkdirSync(join(자리.트리, 'tests'), { recursive: true });
    // tests 가 링크면 트리 밖에 쓴다
    if (realpathSync(join(자리.트리, 'tests')) !== join(realpathSync(자리.트리), 'tests')) return { 까닭: 'tests 폴더가 작업 트리 밖을 가리킨다 — 바탕 파일을 안 쓴다' };
    for (const f of 빈자리) {
      rmSync(join(자리.트리, f), { recursive: true, force: true });
      writeFileSync(join(자리.트리, f), 바탕파일[f]!);
    }
    return { 쓴것: 빈자리 };
  } catch (e) {
    return { 까닭: `바탕 파일을 못 썼다: ${e instanceof Error ? e.message : String(e)}` };
  }
}

/**
 * 대상 저장소 병합 전 검사 — Commander PR 의 CI(author- 잡)가 하던 셋을 PR 머리 사본에서 돌린다. 대상 저장소엔 CI 가 없다.
 * 케이스 코드(스캐너가 import 한다)를 돌리므로 컨테이너(root)에선 자리 uid 로만 — 자리가 없으면 돌리지 않는다
 */
export async function 대상검사(
  손: 보고손,
  준비: { 번호: number; 바탕: string; 저장소: 쓸저장소; 머리: string; 자식: 계정 | null; root인가: boolean },
): Promise<string | null> {
  if (준비.root인가 && 준비.자식 === null) return '자리 없이 잡힌 병합이라 케이스 검사를 돌릴 uid 가 없다 — 다시 넣어라';
  await 손.단계('검사하는 중');
  // 한 시간 훑기가 도는 검사의 사본을 지우지 않게
  도는번호.add(준비.번호);
  const 만든것 = await 사본만들기(준비.번호, 준비.바탕, 준비.저장소, 준비.머리, 준비.자식);
  if ('까닭' in 만든것) {
    도는번호.delete(준비.번호);
    return 만든것.까닭;
  }
  try {
    const 환경 = 검사환경(process.env, 만든것.자리, 준비.자식 !== null);
    for (const [인자, 설명] of [
      [['run', 'typecheck'], '타입 검사'],
      [['run', 'check:tests', '--', '--no-held'], '케이스 규칙 검사'],
      [['run', 'check:secret-names'], '비밀값 이름 검사'],
    ] as const) {
      const r = await 돌린다('npm', [...인자], { cwd: 만든것.자리.트리, env: 환경, uid: 준비.자식?.uid, gid: 준비.자식?.gid, 제한: 600_000 });
      if (r.코드 !== 0) return 검사실패글(설명, r);
    }
    return null;
  } finally {
    if (await 자식거두기(준비.자식)) 사본치우기(만든것.자리);
    도는번호.delete(준비.번호);
  }
}
