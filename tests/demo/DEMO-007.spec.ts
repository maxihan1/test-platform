import { defineCase, test, verify } from '@platform/kit';

export const spec = defineCase({
  tcId: 'DEMO-007',
  name: '응답이 오지 않는 동안 기다리다 실행 제한 시간을 넘긴다',
  precondition: ['실행 제한 시간을 5초로 준다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  await test.step('할 일 목록 화면을 연다', async () => {
    await page.goto('https://demo.playwright.dev/todomvc');
    await verify('화면 제목 todos가 보인다', await page.getByRole('heading', { name: 'todos' }).isVisible(), true);
  });

  await test.step('응답이 오지 않는 동안 기다린다', async () => {
    await page.waitForTimeout(60_000);
    await verify('기다림이 끝났다', true, true);
  });
});
