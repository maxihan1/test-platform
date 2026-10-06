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
  머지인자,
  실행목록인자,
  올릴브랜치,
} from './authoring-chain.js';
import { PR수인자, PR파일인자, 병합직전막힘 } from './authoring-merge-files.js';
import { type 보고손, type 칠때, type 판정기, 멈춤, 쉬기, 진짜main받기, 친다 } from './authoring-io.js';
import { type 반영준비, 반영올리기, 반영작업방, 반영치우기 } from './authoring-held-merge.js';
import { 겹침보기 } from './authoring-conflicts-io.js';

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
  // 요청 하나에 브랜치 하나(author-<뿌리>)가 된 뒤의 PR 과 그 전의 author-<실행 번호> PR 을 둘 다 받는다 (2026-09-29)
  뿌리번호?: number,
): string | null {
  if (원본번호 === undefined) return '원본 요청 번호가 없다 — 어느 PR 인지 확인할 수 없다';
  const 기대 = 올릴브랜치(원본번호);
  const 받는것 = [기대, ...(뿌리번호 === undefined ? [] : [올릴브랜치(뿌리번호)])];
  if (pr.isCrossRepository || !받는것.includes(pr.headRefName)) {
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
  요청뿌리?: number,
  반영?: 반영준비,
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
  const 남의것 = 머지브랜치거부사유(pr, 원본번호, 요청뿌리);
  if (남의것 !== null) {
    await 손.끝내기({ status: 'FAILED', error: 남의것 });
    return;
  }
  // 병합은 됐는데 보고만 잃은 경우다. 다시 누른 것을 실패로 닫으면 사람이 헷갈린다.
  // 이 길도 받아 온 뒤 끝낸다 — 안 받아 오면 케이스 고치기의 저장값이 말없이 남아 반영한 기대값을 가린다
  if (pr.state === 'MERGED') {
    await 당기고끝내기(손, 'MERGED', prUrl, '', 뿌리, 호스트로);
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

  // 지금 main 과 견줘 겹친 케이스를 보고(고르지 않았으면 여기서 멈춘다), 보류 값 · 고른 것 · main 합치기가 있으면
  // 작업 폴더에서 커밋까지 한다 (작성 §3.6 「★ 보류 케이스」 반영 · 「★ 반영 때 겹침 검사」).
  // 올리기는 초안을 푼 뒤다 — 초안에 올리면 잡을 건너뛴 success 실행이 새 머리에 붙어 검사 없이 병합할 수 있다
  const 길 = 반영 === undefined ? null : await 겹침보기(손, 반영, pr.headRefOid, 반영.판.원천, 호스트로, 한번에하나);
  if (반영 !== undefined && 길 === null) return;
  const 브랜치번호 = Number(pr.headRefName.slice('author-'.length));
  const 작업 = 반영 !== undefined && 길?.길 === '작업방' ? await 반영작업방(손, 반영, 브랜치번호, pr.headRefOid, 길.판) : undefined;
  if (작업 === null) return;
  const 적은자리 = 작업?.자리;

  const 이미준비됨 = !pr.isDraft;
  let 이후번호 = 0;
  try {
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
    if (적은자리 !== undefined) {
      const 새머리 = await 반영올리기(손, 적은자리, 브랜치번호, pr.headRefOid, prUrl, 뿌리, 작업?.처리줄 ?? null);
      if (새머리 === null) {
        // 보류가 든 PR 이 준비 상태로 남으면 CI 가 빨갛게 돈다 — 풀어 둔 초안을 되돌린다
        if (pr.isDraft) 친다('gh', ['pr', 'ready', '--undo', prUrl], 뿌리);
        return;
      }
      pr.headRefOid = 새머리;
    }
  } finally {
    if (적은자리 !== undefined && 반영 !== undefined) await 반영치우기(적은자리, 반영.것.id, 반영.자식);
  }

  await 손.단계('CI 기다리는 중');
  const 끝시각 = Date.now() + 전체제한;
  let 다시돌림 = false;
  let 결과: CI결과 = { 판정: '아직' };
  while (Date.now() < 끝시각) {
    // 에이전트가 거절로 멈추는 중이면 병합까지 가지 않는다 — 서버가 끝내기도 안 받는다
    if (멈춤.까닭 !== null) return;
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
  const 파일인자 = PR파일인자(prUrl);
  const 막힘 = 병합직전막힘({
    메인,
    머리: pr.headRefOid,
    목록: () => (파일인자 === null ? { ok: false, 낸것: '', 까닭: `PR 주소 꼴이 아니다 (${prUrl})` } : 친다('gh', 파일인자, 뿌리)),
    수: () => 친다('gh', PR수인자(prUrl), 뿌리),
    테스트만: (파일들, 기준) => 판정(파일들, 기준, 뿌리),
  });
  if (막힘 !== null) {
    await 손.끝내기({ status: 'FAILED', error: 막힘 });
    return;
  }

  await 손.단계('머지하는 중');
  const 친것 = 친다('gh', 머지인자(prUrl, pr.headRefOid), 뿌리);
  const 상태 = 병합뒤상태(친것.ok, 친다('gh', ['pr', 'view', prUrl, '--json', 'state'], 뿌리));
  // 당기기를 DONE 보다 먼저 한다 — 서버는 DONE 을 받으면 케이스 고치기의 저장값을 지우는데,
  // 체크아웃(/tests)이 옛 코드면 실행이 옛 기본값으로 돈다. 그래서 당겼는지를 함께 싣는다 (작성 §3.6 「★ 케이스 고치기」).
  // 예외는 여기서 false 로 닫는다 — 끝내기 전에 던지면 `닫으며` 가 된 병합을 FAILED 로 보낸다
  await 당기고끝내기(손, 상태, prUrl, 친것.까닭, 뿌리, 호스트로);
}

async function 당기고끝내기(손: 보고손, 상태: string, prUrl: string, 까닭: string, 뿌리: string, 호스트로: 칠때): Promise<void> {
  const 당김 =
    상태 === 'MERGED'
      ? await 한번에하나(async () => main당기기(뿌리, 호스트로)).catch((e: unknown) => {
          console.error(`[머지] main 당기기 중 예외: ${e instanceof Error ? e.message : String(e)}`);
          return false;
        })
      : null;
  await 손.끝내기(머지끝몸(상태, prUrl, 까닭, 당김));
}

/** 병합 끝내기 몸. 병합됐으면 당겼는지(`pulled`)를 싣는다 — 서버가 이것이 true 일 때만 저장값을 지운다 */
export function 머지끝몸(상태: string, prUrl: string, 까닭: string, 당김: boolean | null): Record<string, unknown> {
  if (상태 === 'MERGED') return { status: 'DONE', prUrl, result: { pulled: 당김 === true } };
  return { status: 'FAILED', error: `병합이 안 됐다 (${상태}): ${까닭 || '충돌이나 보호 규칙을 봐라'}` };
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

/**
 * 호스트 계정으로 친다 — `status` 도 index 를 다시 쓰므로 root 로 치면 사람이 git 을 못 쓰게 된다.
 * 실제로 당겼을 때만 true — 건너뛰었거나 실패했으면 false 이고, 그러면 서버가 저장값을 지우지 않는다
 */
function main당기기(뿌리: string, 호스트로: 칠때): boolean {
  const 친다호스트 = (인자: string[]) => 친다('git', 인자, 뿌리, undefined, 120_000, 호스트로);
  const 사유 = 당길까(친다호스트(['symbolic-ref', '--short', 'HEAD']), 친다호스트(['status', '--porcelain']));
  // 병합은 이미 됐다. 실패해도 되돌리지 않고 사람이 볼 수 있게 찍는다 — 안 찍으면 「목록에 안 뜬다」가 조용히 돌아온다
  if (사유 !== null) {
    console.error(`[머지] main 을 안 당겼다: ${사유}. 새 테스트를 보려면 직접 git pull 하라.`);
    return false;
  }
  const r = 친다호스트(당김인자);
  console.log(r.ok ? '[머지] main 을 당겼다 — 새 테스트가 목록에 뜬다.' : `[머지] main 당기기 실패: ${r.까닭}`);
  return r.ok;
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
