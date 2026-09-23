// 작성 에이전트의 머지 껍데기 — 초안 해제 → CI 를 기다림 → 초록이면 병합. 판단은 authoring-chain 의 순수 함수에 있다
//
// **맥은 병합 여부를 스스로 정하지 않는다.** 사람이 화면에서 머지를 눌렀고, 맥은 CI 가 초록인지만 본다.
// main 보호가 `enforce_admins: false` 라 빨간 PR 병합을 막는 것은 이 기다림과 `머지인자` 뿐이다.

import {
  type CI결과,
  type CI실행,
  CI실행주소,
  CI판정,
  PR준비인자,
  다시돌릴인자,
  머지거부사유,
  머지인자,
  PR파일인자,
  실행목록인자,
  올릴브랜치,
} from './authoring-chain.js';
import { type 보고손, type 칠때, type 판정기, 쉬기, 진짜main받기, 친다 } from './authoring-io.js';

const 폴링간격 = 15_000;
// ponytail: 루프 시간으로 잰다 — 맥에는 GNU timeout 이 없다. CI 가 늘 17분을 넘기면 이 숫자를 올린다
const 전체제한 = 17 * 60_000;

/**
 * 에이전트가 원본 요청(`원본번호`)으로 올린 그 브랜치의 PR 인가. 끝내기(`finish`)에 실린 prUrl 은 형식만 검사되므로
 * 같은 저장소의 **아무 PR** 이 실려 와도 병합될 수 있었다 (PR #68 게이트 2 후속). 포크의 같은 이름도 막는다
 */
export function 머지브랜치거부사유(
  pr: { headRefName: string; isCrossRepository: boolean },
  원본번호: number | undefined,
): string | null {
  if (원본번호 === undefined) return '원본 요청 번호가 없다 — 어느 PR 인지 확인할 수 없다';
  const 기대 = 올릴브랜치(원본번호);
  if (pr.isCrossRepository || pr.headRefName !== 기대) {
    return `이 PR 은 에이전트가 올린 ${기대} 가 아니다 (${pr.isCrossRepository ? '포크 · ' : ''}${pr.headRefName}) — 병합하지 않는다`;
  }
  return null;
}

let 앞일: Promise<unknown> = Promise.resolve();

/** 서버 저장소에 쓰는 git(기준 받기·병합 뒤 당기기)은 한 번에 하나. 둘이 겹치면 `.git` 잠금에서 한쪽이 죽는다 */
export function 한번에하나<T>(일: () => Promise<T>): Promise<T> {
  const 이번 = 앞일.then(일, 일);
  앞일 = 이번.catch(() => undefined);
  return 이번;
}

/** 원본 PR 주소로 병합까지 간다. 예외는 부르는 쪽(`한건처리` 의 `닫으며`)이 닫는다 */
export async function 머지처리(
  손: 보고손,
  prUrl: string,
  판정: 판정기,
  원본번호: number | undefined,
  뿌리: string,
  호스트로: 칠때,
): Promise<void> {
  const 뷰 = 친다('gh', ['pr', 'view', prUrl, '--json', 'headRefName,headRefOid,isDraft,state,isCrossRepository'], 뿌리);
  if (!뷰.ok) {
    await 손.끝내기({ status: 'FAILED', error: `PR 을 못 읽었다: ${뷰.까닭}` });
    return;
  }
  const pr = JSON.parse(뷰.낸것) as {
    headRefName: string;
    headRefOid: string;
    isDraft: boolean;
    state: string;
    isCrossRepository: boolean;
  };
  const 남의것 = 머지브랜치거부사유(pr, 원본번호);
  if (남의것 !== null) {
    await 손.끝내기({ status: 'FAILED', error: 남의것 });
    return;
  }
  // 병합은 됐는데 보고만 잃은 경우다. 다시 누른 것을 실패로 닫으면 사람이 헷갈린다
  if (pr.state === 'MERGED') {
    await 손.끝내기({ status: 'DONE', prUrl });
    return;
  }
  if (pr.state !== 'OPEN') {
    await 손.끝내기({ status: 'FAILED', error: `PR 이 열려 있지 않다 (${pr.state})` });
    return;
  }

  const 목록읽기 = (): CI실행[] | null => {
    const r = 친다('gh', 실행목록인자(pr.headRefName), 뿌리);
    if (!r.ok) {
      console.error(`[기다림] CI 실행 목록을 못 읽었다: ${r.까닭}`);
      return null;
    }
    try {
      return JSON.parse(r.낸것) as CI실행[];
    } catch (e) {
      console.error(`[기다림] CI 실행 목록을 못 풀었다: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }
  };

  const 이미준비됨 = !pr.isDraft;
  let 이후번호 = 0;
  if (pr.isDraft) {
    // 초안일 때 뜬 실행(잡을 건너뛴 채 끝난 것)을 기준으로 잡아 두고 그 뒤 실행만 본다.
    // ★ 못 읽었으면 여기서 멈춘다 — 기준이 0 이 되면 건너뛴 채 success 로 끝난 초안 실행을
    // 새 실행으로 읽어 **검사 없이 병합한다** (2026-09-23 검증이 잡았다)
    const 전목록 = 목록읽기();
    if (전목록 === null) {
      await 손.끝내기({ status: 'FAILED', error: 'CI 실행 목록을 못 읽어 초안을 안 풀었다 — 다시 눌러라' });
      return;
    }
    const 전 = CI판정(pr.headRefOid, 전목록);
    이후번호 = '번호' in 전 ? 전.번호 : 0;
    const 풀기 = 친다('gh', PR준비인자(prUrl), 뿌리);
    if (!풀기.ok) {
      await 손.끝내기({ status: 'FAILED', error: `초안을 못 풀었다: ${풀기.까닭}` });
      return;
    }
  }

  await 손.단계('CI 기다리는 중');
  const 끝시각 = Date.now() + 전체제한;
  let 다시돌림 = false;
  let 결과: CI결과 = { 판정: '아직' };
  while (Date.now() < 끝시각) {
    const 실행들 = 목록읽기();
    if (실행들 !== null) {
      결과 = CI판정(pr.headRefOid, 실행들, 이후번호);
      if (결과.판정 === '초록') break;
      if (결과.판정 === '빨강') {
        const 다시 = 다시돌림 ? null : 다시돌릴인자(이미준비됨, 결과);
        if (다시 === null) {
          await 손.끝내기({
            status: 'FAILED',
            error: `CI 가 빨갛다 (${결과.이유}): ${CI실행주소(prUrl, 결과.번호)}`,
          });
          return;
        }
        const r = 친다('gh', 다시, 뿌리);
        if (!r.ok) {
          await 손.끝내기({ status: 'FAILED', error: `CI 를 다시 못 돌렸다: ${r.까닭}` });
          return;
        }
        다시돌림 = true;
      }
    }
    await 쉬기(폴링간격);
  }

  if (결과.판정 !== '초록') {
    const 어디 = '번호' in 결과 ? ` ${CI실행주소(prUrl, 결과.번호)}` : '';
    await 손.끝내기({ status: 'FAILED', error: `CI 가 17분 안에 초록이 안 됐다 (${결과.판정}).${어디}` });
    return;
  }

  // 케이스만 바꾼 PR 인지 병합 직전에 다시 본다. 판정 규칙은 켤 때 고정한 cases-only.mjs 이고
  // 기준은 GitHub 이 지금 말하는 main 이다 — 로컬 origin/main 은 자식이 옮겨 놓았을 수 있다
  const 메인 = await 한번에하나(async () => 진짜main받기(뿌리, 호스트로));
  const 목록 = 친다('gh', PR파일인자(prUrl), 뿌리);
  const 파일들 = 목록.낸것.split('\n').filter((f) => f !== '');
  const 막힘 = '까닭' in 메인
    ? `최신 main 을 못 받아 판정을 못 했다: ${메인.까닭}`
    : !목록.ok
      ? `PR 의 바뀐 파일을 못 읽었다: ${목록.까닭}`
      : 머지거부사유(판정(파일들, 메인.sha, 뿌리), 파일들);
  if (막힘 !== null) {
    await 손.끝내기({ status: 'FAILED', error: 막힘 });
    return;
  }

  await 손.단계('머지하는 중');
  const 친것 = 친다('gh', 머지인자(prUrl, pr.headRefOid), 뿌리);
  const 상태 = 병합뒤상태(친것.ok, 친다('gh', ['pr', 'view', prUrl, '--json', 'state'], 뿌리));
  await 손.끝내기(
    상태 === 'MERGED'
      ? { status: 'DONE', prUrl }
      : { status: 'FAILED', error: `병합이 안 됐다 (${상태}): ${친것.까닭 || '충돌이나 보호 규칙을 봐라'}` },
  );
  if (상태 === 'MERGED') await 한번에하나(async () => main당기기(뿌리, 호스트로));
}

/**
 * 빨리감기만 한다. 사람 체크아웃에 병합 커밋을 몰래 만들지 않는다.
 * **훅과 fsmonitor 를 끈다** — 맥 경로에서는 자식이 서버 저장소 `.git` 을 쓸 수 있어서, 켜 두면 자식이 써 둔
 * post-merge 훅이 GitHub 자격증명을 가진 권한으로 돈다 (2026-09-23 보안 검사가 잡았다).
 * 컨테이너에서는 자식이 다른 uid 라 `.git` 에 못 쓴다 (2026-09-24). 맥은 `.git/config` 의 filter·sshCommand 가 여전히 열려 있다
 */
export const 당김인자 = [
  '-c',
  'core.hooksPath=/dev/null',
  '-c',
  'core.fsmonitor=false',
  'pull',
  '--ff-only',
  'origin',
  'main',
];

/**
 * 병합 뒤 맥의 main 체크아웃을 당길지. 당기면 `null`, 건너뛰면 사유.
 *
 * **서버는 맥의 체크아웃을 `/tests` 로 본다** (docker-compose `./tests:/tests:ro`) — 안 당기면
 * 병합된 새 테스트가 목록에 안 뜬다 (#3811 뒤 실측, 2026-09-23). 사람이 그 체크아웃에서
 * 다른 가지를 보고 있거나 고치던 것이 있으면 손대지 않는다.
 * 서버와 맥이 다른 기계면 이것으로 안 풀린다 — 서버 쪽 동기화는 후속이다 (docs/SETUP.md §8).
 */
export function 당길까(가지: { ok: boolean; 낸것: string }, 상태: { ok: boolean; 낸것: string }): string | null {
  if (!가지.ok || !상태.ok) return '체크아웃의 가지나 상태를 못 읽었다';
  if (가지.낸것.trim() !== 'main') return `체크아웃이 main 이 아니다 (${가지.낸것.trim()})`;
  if (상태.낸것.trim() !== '') return '체크아웃에 고친 파일이 있다';
  return null;
}

/** 호스트 계정으로 친다 — `status` 도 index 를 다시 쓰므로 root 로 치면 사람이 git 을 못 쓰게 된다 */
function main당기기(뿌리: string, 호스트로: 칠때): void {
  const 친다호스트 = (인자: string[]) => 친다('git', 인자, 뿌리, undefined, 120_000, 호스트로);
  const 사유 = 당길까(친다호스트(['symbolic-ref', '--short', 'HEAD']), 친다호스트(['status', '--porcelain']));
  // 요청은 이미 DONE 이다. 실패해도 되돌리지 않고 사람이 볼 수 있게 찍는다 — 안 찍으면 「목록에 안 뜬다」가 조용히 돌아온다
  if (사유 !== null) {
    console.error(`[머지] main 을 안 당겼다: ${사유}. 새 테스트를 보려면 직접 git pull 하라.`);
    return;
  }
  const r = 친다호스트(당김인자);
  console.log(r.ok ? '[머지] main 을 당겼다 — 새 테스트가 목록에 뜬다.' : `[머지] main 당기기 실패: ${r.까닭}`);
}

/**
 * 병합 뒤 PR 상태. 병합 명령이 성공(EXIT 0)했으면 상태를 못 읽거나 못 풀어도 병합된 것으로 본다 —
 * 된 병합을 FAILED 로 덮으면 사람이 또 누르고, 그 요청은 끝내 실패로 남는다
 */
export function 병합뒤상태(병합됨: boolean, 뷰: { ok: boolean; 낸것: string }): string {
  const 모름 = 병합됨 ? 'MERGED' : '못 읽음';
  if (!뷰.ok) return 모름;
  try {
    return (JSON.parse(뷰.낸것) as { state: string }).state;
  } catch (e) {
    console.error(`[머지] 병합 뒤 PR 상태를 못 풀었다: ${e instanceof Error ? e.message : String(e)}`);
    return 모름;
  }
}
