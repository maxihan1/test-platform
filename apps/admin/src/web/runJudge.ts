// 실행 결과 화면의 버튼을 띠에서 고른 서비스가 아니라 그 실행의 서비스 칸으로 가른다 (화면공통 §8)
// 띠가 다른 서비스인 채로 Slack 알림 주소(#/runs/:id)를 열면 남의 칸으로 버튼이 서거나 사라진다

import type { RunItemSummary } from './api.js';
import { 케이스서비스, type 판정 } from './role.js';

/** 접두사를 주면 그 서비스의 판정을 내는 것. 부르는 쪽이 사람을 이미 물고 있다 */
export type 판정하기 = (접두사: string | null) => 판정;

// 실행 응답에는 서비스 접두사 칸이 없다. tcId 접두사가 곧 서비스이고 한 실행에 서비스가 섞이지 않는다 (SPEC §7).
// 항목이 없으면 접두사를 모른다 — null 로 넘겨 운영 계정 말고는 아무것도 안 서게 한다
export function 실행판정(판정하기: 판정하기, data: { items: RunItemSummary[] } | null): 판정 {
  const tcId = data?.items[0]?.tcId;
  return 판정하기(tcId === undefined ? null : 케이스서비스(tcId));
}
