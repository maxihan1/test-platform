// 시나리오 실측용 가짜 케이스 — 앞 부품이 담은 숫자를 이어받는지 본다. 「만들기」를 건너뛰어야 통과한다 (apps/runner/scenario/e2e.test.ts)

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
    await page.goto(`data:text/html;charset=utf-8,${encodeURIComponent('<h1 id="t">장바구니</h1><p id="n">0</p>')}`);
  });

  await test.step('담긴 숫자를 본다', async () => {
    await verify('숫자가 1이다', await page.locator('#n').innerText(), '1', { blocker: true });
  });
});
