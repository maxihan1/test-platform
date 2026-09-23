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
} from './authoring-chain.js';
import { type 보고손, 쉬기, 친다 } from './authoring-run.js';

const 폴링간격 = 15_000;
// ponytail: 루프 시간으로 잰다 — 맥에는 GNU timeout 이 없다. CI 가 늘 17분을 넘기면 이 숫자를 올린다
const 전체제한 = 17 * 60_000;

/** 원본 PR 주소와 그 PR 의 브랜치 번호(원본 요청 번호)로 병합까지 간다 */
export async function 머지처리(손: 보고손, 번호: number, prUrl: string): Promise<void> {
  const 뿌리 = process.cwd();
  const 뷰 = 친다('gh', ['pr', 'view', prUrl, '--json', 'headRefOid,isDraft,state'], 뿌리);
  if (!뷰.ok) {
    await 손.끝내기({ status: 'FAILED', error: `PR 을 못 읽었다: ${뷰.까닭}` });
    return;
  }
  const pr = JSON.parse(뷰.낸것) as { headRefOid: string; isDraft: boolean; state: string };
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
    const r = 친다('gh', 실행목록인자(번호), 뿌리);
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

  await 손.단계('머지하는 중');
  const 친것 = 친다('gh', 머지인자(prUrl), 뿌리);
  const 뒤 = 친다('gh', ['pr', 'view', prUrl, '--json', 'state'], 뿌리);
  const 상태 = 뒤.ok ? (JSON.parse(뒤.낸것) as { state: string }).state : '못 읽음';
  await 손.끝내기(
    상태 === 'MERGED'
      ? { status: 'DONE', prUrl }
      : { status: 'FAILED', error: `병합이 안 됐다 (${상태}): ${친것.까닭 || '충돌이나 보호 규칙을 봐라'}` },
  );
}
