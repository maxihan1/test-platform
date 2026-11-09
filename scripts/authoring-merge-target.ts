// 대상 저장소 PR 의 병합 마무리 — CI 대신 PR 머리 사본에서 검사 셋 → 초안 풀기 → 병합 직전 「테스트만」 판정(거울) → 병합 (도메인/작성 「케이스를 쓰고 PR 을 올리는 곳」)
// 대상 저장소엔 검사 CI 가 없다 — 워크플로 push 에 workflow 권한이 따로 들고 수정 AI 도 .github/ 를 안 건드린다. authoring-merge 가 300줄을 넘지 않게 뗐다

import { PR준비인자, 머지인자, 올린파일인자 } from './authoring-chain.js';
import type { 반영준비 } from './authoring-held-merge.js';
import { type 보고손, type 칠때, type 판정기, 진짜main받기, 친다, 커밋받기 } from './authoring-io.js';
import { 머지끝몸, 바탕보기, 병합뒤상태, 병합직전막힘 } from './authoring-merge-files.js';
import { 거울차례, 대상검사 } from './authoring-repo-io.js';
import type { 바뀐것 } from './authoring-conflicts-apply.js';

export async function 대상병합(
  손: 보고손,
  pr: { url: string; 머리: string; isDraft: boolean },
  판정: 판정기,
  반영: 반영준비,
  호스트로: 칠때,
  바뀐: 바뀐것[],
): Promise<void> {
  const 거울 = 반영.저장소.원천;
  const 실패 = (error: string) => 손.끝내기({ status: 'FAILED', error });
  const 검사막힘 = await 대상검사(손, { 번호: 반영.것.id, 바탕: 반영.판.바탕, 저장소: 반영.저장소, 머리: pr.머리, 자식: 반영.자식, root인가: 반영.판.계정 !== null });
  if (검사막힘 !== null) return void (await 실패(검사막힘));
  if (pr.isDraft) {
    const 풀기 = 친다('gh', PR준비인자(pr.url), 거울);
    if (!풀기.ok) return void (await 실패(`초안을 못 풀었다: ${풀기.까닭}`));
  }
  // 기준은 GitHub 이 지금 말하는 대상 저장소 main — 거울에 받는다. 판정 규칙은 켤 때 고정한 cases-only.mjs
  const 메인 = await 거울차례(거울, async () => 진짜main받기(거울, 호스트로));
  const 머리 = '까닭' in 메인 ? 메인 : await 거울차례(거울, async () => 커밋받기(거울, pr.머리, 'PR 머리', 호스트로));
  const 깃 = (인자: string[]) => 친다('git', 인자, 거울);
  const 막힘 = 병합직전막힘({
    메인,
    머리,
    목록: (기준, 머리sha) => 깃(올린파일인자(기준, 머리sha)),
    테스트만: (파일들, 기준) => 판정(파일들, 기준, 거울),
    바탕: 바탕보기(깃, true),
  });
  if (막힘 !== null) return void (await 실패(막힘));
  await 손.단계('머지하는 중');
  const 친것 = 친다('gh', 머지인자(pr.url, pr.머리), 거울);
  const 상태 = 병합뒤상태(친것.ok, 친다('gh', ['pr', 'view', pr.url, '--json', 'state'], 거울));
  // 에이전트가 당길 체크아웃이 없다 — 서버의 1분 받아 오기가 받고 훑는다. 그래서 pulled 는 true (`머지끝몸`)
  await 손.끝내기(머지끝몸(상태, pr.url, 친것.까닭, true, 바뀐));
}
