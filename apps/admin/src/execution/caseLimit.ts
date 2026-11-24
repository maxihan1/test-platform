// 케이스가 실제로 끊기는 한도 — 진행 카드의 「제한」 (도메인/실행 §7 `GET /api/runs/:runId/progress`)

import type { Platform } from '@platform/kit';

import { 케이스한도 } from '../scenario/procStep.js';

// 웹 프로젝트는 timeout 을 안 적어 Playwright 기본값이다. 값이 playwright.config.ts 와 같은지는 caseLimit.test.ts 가 본다
const 웹한도 = 30_000;

/**
 * 박제된 timeout_ms(기본 5분)는 러너가 프로세스를 통째로 끊는 안전판이라 테스트 설정의 한도가 먼저 끊는다 —
 * 그대로 보이면 「제한 5분」인데 30초나 2분에 끊긴다. 요청이 더 짧게 줄였으면 그 값이 먼저고, 0(게임 시나리오)은 한도 없음 그대로다
 */
export const 실제한도 = (platform: Platform, 박제ms: number): number => Math.min(박제ms, platform === 'desktop' || platform === 'mobile' ? 웹한도 : 케이스한도);
