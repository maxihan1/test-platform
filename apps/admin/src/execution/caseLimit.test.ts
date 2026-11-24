// 케이스가 실제로 끊기는 한도가 테스트 설정(playwright.config.ts)과 같은지 본다 — 어긋나면 진행 카드가 「제한 5분」이라 적고 2분에 끊긴다

import { describe, expect, it } from 'vitest';

import { PC_PLATFORMS } from '@platform/kit/types';

import 설정 from '../../../../playwright.config.js';
import { 실제한도 } from './caseLimit.js';

// timeout 을 안 적은 프로젝트는 Playwright 기본값이다
const 설정한도 = (이름: string) => 설정.projects?.find((p) => p.name === 이름)?.timeout ?? 설정.timeout ?? 30_000;

describe('실제한도', () => {
  it.each(['desktop', 'mobile', 'android', ...PC_PLATFORMS] as const)('%s 는 테스트 설정의 한도와 같다', (platform) => {
    expect(실제한도(platform, 300_000)).toBe(설정한도(platform));
  });

  it('실행 요청이 더 짧게 줄였으면 그 값이 먼저 끊는다', () => {
    expect(실제한도('desktop', 5_000)).toBe(5_000);
  });

  it('0 은 한도 없음(게임 시나리오) 그대로다', () => {
    expect(실제한도('android', 0)).toBe(0);
  });
});
