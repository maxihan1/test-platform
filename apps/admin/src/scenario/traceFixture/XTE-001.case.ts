// trace 실측용 가짜 케이스 — 누르면 화면 스크립트가 잡히지 않은 오류를 던지고 판정이 빨개진다 (scenario/traceContract.test.ts)
// 화면은 모킹 부품이 준다. SC-1618 과 같은 꼴이다 — await 뒤에 e.currentTarget(null)을 넘긴다

import { defineCase, test, verify } from '@platform/kit';

export const spec = defineCase({
  tcId: 'XTE-001',
  name: '누르면 화면 스크립트가 터진다',
  precondition: [],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  await test.step('화면을 연다', async () => {
    await page.goto('/');
  });

  await test.step('지우고 0건을 본다', async () => {
    await page.click('#b');
    await page.waitForTimeout(200);
    await verify('남은 건수가 0이다', await page.locator('#n').innerText(), '0');
  });
});
