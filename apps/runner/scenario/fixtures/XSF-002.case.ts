// 시나리오 실측용 가짜 케이스 — 앞 부품이 담은 수를 이어받는지 본다. 「만들기」를 건너뛰어야 통과한다 (apps/runner/scenario/e2e.test.ts)
// 부품마다 새 창이라 화면은 안 넘어오고 로그인 상태(쿠키 · localStorage)만 넘어온다 (시나리오 §3.7 결정 3)

import { defineCase, test, verify } from '@platform/kit';

export const spec = defineCase({
  tcId: 'XSF-002',
  name: '담은 것이 결제 화면에 이어진다',
  precondition: [],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  await test.step('장바구니 화면을 세운다', async () => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('담음', '0'));
  });

  await test.step('담긴 숫자를 본다', async () => {
    await page.goto('/');
    await verify('숫자가 1이다', await page.evaluate(() => localStorage.getItem('담음')), '1', { blocker: true });
  });
});
