// 실행 요청의 게임 칸(엔진 · 어드민 키)을 만든다 — 정식 실행 · 테스트 실행 · 기기 성능이 같이 쓴다 (도메인/게임 §3.10 결정 6 · API 항목의 어드민 키)

import type { Platform } from '@platform/kit';

import type { 어드민키 } from '../settings/envs.js';

/**
 * 게임 애플리케이션의 android 항목만 엔진을 싣고, 그 대상 서버 줄에 어드민 키가 있으면 같이 싣는다.
 * API 애플리케이션 항목은 엔진 없이 어드민 키만 — 케이스가 서버 어드민 API 를 몸통 admin 으로 부른다 (도메인/API §3.8 「API 인증」 「어드민 키」)
 */
export const 엔진칸 = (
  kind: string | null | undefined,
  platform: Platform,
  키?: 어드민키 | null,
): { engine?: 'GAME'; adminKey?: 어드민키 } => {
  if (kind === 'GAME' && platform === 'android') return { engine: 'GAME', ...(키 != null && { adminKey: 키 }) };
  return kind === 'API' && 키 != null ? { adminKey: 키 } : {};
};
