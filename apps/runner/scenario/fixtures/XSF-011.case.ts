// 시나리오 실측용 가짜 앱 케이스 — 폰을 여는 자리에 받은 팜 토큰을 그대로 오류로 되돌려 보낸다 (apps/runner/scenario/e2e.test.ts)
// kit 은 이미 올라간 폰 열기를 덮지 않는다(??=). 그래서 진짜 Appium 대신 이 가짜가 열기를 받는다

import { defineCase, test, verify } from '@platform/kit';

(globalThis as unknown as Record<symbol, unknown>)[Symbol.for('platform.scenarioPhone')] = {
  open: (env: Record<string, string | undefined>) => Promise.reject(new Error(`폰 열기 토큰=${env.PLATFORM_APPIUM_TOKEN ?? '없음'}`)),
  close: () => Promise.resolve(),
};

export const spec = defineCase({
  tcId: 'XSF-011',
  name: '폰을 연다',
  platforms: ['android'],
  precondition: [],
  params: null,
  expected: null,
});

test(spec, async ({ driver }) => {
  await test.step('폰을 본다', async () => {
    await verify('연결이 있다', driver !== undefined, true);
  });
});
