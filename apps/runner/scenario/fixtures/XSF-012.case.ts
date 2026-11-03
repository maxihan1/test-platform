// 시나리오 실측용 가짜 케이스 — 탭 · 창에 상태를 잔뜩 건 채 끝난다. 다음 단계(XSF-013 · XSF-014)가 무엇이 이어지고 무엇이 되돌려졌는지 본다 (apps/runner/scenario/e2e.test.ts)
// 시계 고정 · 주입 스크립트 · 가로채기 · 새 탭은 단계 끝에 러너가 되돌린다. 로그인 상태(쿠키 · localStorage)와 화면은 이어진다 (시나리오 §3.7 결정 3)

import { defineCase, test, verify } from '@platform/kit';

export const spec = defineCase({
  tcId: 'XSF-012',
  name: '탭과 창에 상태를 걸고 끝난다',
  precondition: [],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  await test.step('화면을 열고 로그인 상태를 남긴다', async () => {
    await page.goto('/');
    await page.evaluate(() => {
      document.title = '앞 단계';
      localStorage.setItem('남김', '1');
      sessionStorage.setItem('탭값', '1');
      document.cookie = 'ui=1; path=/';
    });
    await verify('제목이 바뀌었다', await page.title(), '앞 단계');
  });

  await test.step('시계 · 스크립트 · 가로채기 · 새 탭을 건다', async () => {
    await page.clock.setFixedTime(new Date('2020-01-02T00:00:00Z'));
    await page.addInitScript(() => {
      (window as unknown as Record<string, string>)['샌것'] = '탭';
    });
    await page.context().addInitScript(() => {
      (window as unknown as Record<string, string>)['창샌것'] = '창';
    });
    await page.route('**/api/hello', (route) => route.fulfill({ contentType: 'text/plain', body: '가짜' }));
    await page.context().newPage();
    await verify('시계가 2020년에 멈췄다', await page.evaluate(() => new Date().getFullYear()), 2020);
  });
});
