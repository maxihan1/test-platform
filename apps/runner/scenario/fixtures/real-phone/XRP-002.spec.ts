// 실제 폰 Chrome 실측용 가짜 모바일 케이스 — 다른 계정으로 들어가려고 창을 새로 만든다. 폰 Chrome 은 창을 하나만 쓴다 (apps/runner/scenario/real-phone.test.ts)

import { defineCase, test, verify } from '@platform/kit';

export const spec = defineCase({
  tcId: 'XRP-002',
  name: '폰 Chrome 에서 창을 새로 만든다',
  precondition: [],
  params: null,
  expected: null,
  platforms: ['mobile'],
});

test(spec, async ({ page }) => {
  await test.step('화면을 연다', async () => {
    await page.goto('/');
    await verify('제목이 보인다', await page.locator('#t').innerText(), '폰 화면');
  });

  await test.step('다른 계정 창을 연다', async () => {
    const 창 = await page.context().browser()?.newContext();
    await verify('새 창이 열렸다', 창 !== undefined, true);
  });
});
