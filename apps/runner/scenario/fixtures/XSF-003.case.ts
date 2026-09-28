// 시나리오 실측용 가짜 케이스 — 없는 주소로 가서 모킹 부품이 건 응답을 본다. 모킹이 context 에 걸렸는지 확인한다 (apps/runner/scenario/e2e.test.ts)

import { defineCase, test, verify } from '@platform/kit';

export const spec = defineCase({
  tcId: 'XSF-003',
  name: '점검 화면이 뜬다',
  precondition: [],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  await test.step('홈으로 간다', async () => {
    await page.goto('https://xsf.invalid/home');
    await verify('점검 안내가 보인다', await page.locator('h1').innerText(), '점검 중');
  });
});
