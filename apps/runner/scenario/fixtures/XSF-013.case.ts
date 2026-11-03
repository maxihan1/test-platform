// 시나리오 실측용 가짜 케이스 — XSF-012 뒤에 돌아 같은 탭에서 이어 시작하는지, 앞 단계가 건 것이 되돌려졌는지 본다 (apps/runner/scenario/e2e.test.ts)
// 시계는 떼지 못해 지금 시각에 흐르게 돌려 놓는다 — 다시 설치하면 시각만 다시 정한다 (시나리오 §3.7 결정 3 「단계 끝 되돌리기」 · 2026-11-03 TMO-F2-01 실측)

import { defineCase, test, verify } from '@platform/kit';

export const spec = defineCase({
  tcId: 'XSF-013',
  name: '앞 단계 화면에서 이어 시작하고 샌 것이 없다',
  precondition: [],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  await test.step('앞 단계 화면에서 시작한다', async () => {
    await verify('앞 단계 제목이 그대로다', await page.title(), '앞 단계');
    await verify('앞 단계가 연 탭은 닫혔다', page.context().pages().length, 1);
  });

  await test.step('앞 단계가 건 것이 없다', async () => {
    await page.goto('/');
    const 샌것 = await page.evaluate(() => [(window as unknown as Record<string, unknown>)['샌것'] ?? null, (window as unknown as Record<string, unknown>)['창샌것'] ?? null]);
    await verify('주입 스크립트가 떨어졌다', 샌것, [null, null]);
    await verify('가로채기가 떨어졌다', await page.evaluate(async () => (await fetch('/api/hello')).status), 404);
    await verify('로그인 상태는 이어진다', await page.evaluate(() => [localStorage.getItem('남김'), document.cookie.includes('ui=1')]), ['1', true]);
  });

  await test.step('시계가 지금 시각에 흐른다', async () => {
    await verify('2020년이 아니다', await page.evaluate(() => new Date().getFullYear() >= 2026), true);
    const 앞 = await page.evaluate(() => Date.now());
    await page.waitForTimeout(200);
    await verify('시간이 흐른다', (await page.evaluate(() => Date.now())) - 앞 >= 100, true);
  });

  await test.step('시계를 다시 설치하면 그 시각에서 시작한다', async () => {
    await page.clock.install({ time: new Date('2021-03-04T00:00:00Z') });
    await verify('2021년이다', await page.evaluate(() => new Date().getFullYear()), 2021);
  });
});
