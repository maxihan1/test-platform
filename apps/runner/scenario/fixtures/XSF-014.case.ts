// 시나리오 실측용 가짜 케이스 — 넘겨받기를 끈 단계로 XSF-012 뒤에 돌아, 같은 창에서 로그인 상태가 비었는지 본다 (apps/runner/scenario/e2e.test.ts)
// 쿠키 · localStorage 는 창에서 비우고 sessionStorage 는 지금 탭의 지금 출처 것만 지운다 (시나리오 §3.7 결정 12 「넘겨받기 끔」 · 2026-11-03 TMO-F2-01 실측)

import { defineCase, test, verify } from '@platform/kit';

export const spec = defineCase({
  tcId: 'XSF-014',
  name: '넘겨받기를 끄면 로그인 상태 없이 시작한다',
  precondition: [],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  await test.step('로그인 상태가 비었다', async () => {
    await verify('sessionStorage 가 비었다', await page.evaluate(() => sessionStorage.getItem('탭값')), null);
    await page.goto('/');
    await verify('localStorage · 쿠키가 비었다', await page.evaluate(() => [localStorage.getItem('남김'), document.cookie]), [null, '']);
  });
});
