// 시나리오 실측용 가짜 케이스 — 화면을 세우고 숫자를 1로 올린다. 인터넷 없이 data: 주소로만 돈다 — about:blank 면 kit 이 사진을 안 찍는다 (apps/runner/scenario/e2e.test.ts)

import { defineCase, test, verify } from '@platform/kit';

export const spec = defineCase({
  tcId: 'XSF-001',
  name: '장바구니에 하나를 담는다',
  precondition: [],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  await test.step('장바구니 화면을 세운다', async () => {
    await page.goto(`data:text/html;charset=utf-8,${encodeURIComponent('<h1 id="t">장바구니</h1><p id="n">0</p>')}`);
    await verify('제목이 보인다', await page.locator('#t').innerText(), '장바구니');
  });

  await test.step('하나를 담는다', async () => {
    await page.evaluate(() => {
      const n = document.querySelector('#n');
      if (n) n.textContent = '1';
    });
    await verify('숫자가 1이다', await page.locator('#n').innerText(), '1');
  });
});
