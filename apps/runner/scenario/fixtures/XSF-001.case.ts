// 시나리오 실측용 가짜 케이스 — 화면을 세우고 담은 수를 1로 올린다. 담은 수는 localStorage 에 둬서 다음 부품의 새 창으로 넘어간다 (apps/runner/scenario/e2e.test.ts)
// 화면은 대상 주소(실측 서버나 모킹)로 열고 내용은 스스로 그린다 — data: 주소는 출처가 없어 localStorage 를 못 쓴다 (시나리오 §3.7 결정 3)

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
    await page.goto('/');
    await page.evaluate(() => {
      document.body.innerHTML = '<h1 id="t">장바구니</h1>';
      localStorage.setItem('담음', '0');
    });
    await verify('제목이 보인다', await page.locator('#t').innerText(), '장바구니');
  });

  await test.step('하나를 담는다', async () => {
    await page.evaluate(() => localStorage.setItem('담음', '1'));
    await verify('담은 수가 1이다', await page.evaluate(() => localStorage.getItem('담음')), '1');
  });
});
