// 시나리오 실측용 가짜 케이스 — 섞인 시나리오의 다른 애플리케이션 단계로 돌아 상대 주소가 그 단계 주소로 풀리는지 본다 (apps/runner/scenario/e2e.test.ts)
// 창의 기준 주소는 시작 애플리케이션으로 굳어 있다. 러너가 goto · 주소 맞추기 · page.request 를 그 단계 주소로 푼다 (러너 §5.2 「창 하나로 끝까지」 · 2026-11-03 TMO-F2-01 실측)

import { defineCase, test, verify } from '@platform/kit';

export const spec = defineCase({
  tcId: 'XSF-015',
  name: '다른 애플리케이션 단계의 상대 주소는 그 애플리케이션으로 간다',
  precondition: [],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  await test.step('상대 주소로 열고 기다린다', async () => {
    await page.goto('/?step=2');
    await page.waitForURL('/?step=2', { timeout: 5000 });
    await verify('API 를 같은 애플리케이션에 부른다', (await page.request.get('/api/xsf-mix')).status(), 404);
  });
});
