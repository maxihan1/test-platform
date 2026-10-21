// 성능 실행이 멈춘 까닭 한 줄 — 실행 로그와 Slack 알림이 같은 글을 쓴다 (도메인/성능 §3.9 「끝난 모양마다 상태 · 판정 · 까닭」)

import { AGENT_LOST_SEC, ERROR_LIMIT_PCT, STREAK_SEC } from './judge.js';

export const 사유: Record<string, string> = {
  TARGET_EXCEEDED: `성능 목표를 ${STREAK_SEC}초 이어 벗어나 자동 중단했습니다`,
  ERROR_LIMIT: `에러율 ${ERROR_LIMIT_PCT}% 이상이 ${STREAK_SEC}초 이어져 대상 서버를 지키려고 자동 중단했습니다`,
  AGENT_LOST: `부하 발생 에이전트가 ${AGENT_LOST_SEC}초 동안 연락이 없어 중단했습니다`,
  SMOKE_FAILED: '스모크 테스트에서 에러가 나 본 테스트를 하지 않았습니다',
  USER: '실행을 중단했습니다',
};
