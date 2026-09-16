import { defineCase, test, verify } from '@platform/kit';

export const spec = defineCase({
  tcId: 'DEMO-001',
  name: '메인 화면이 열린다',
  precondition: ['할 일 목록 데모 사이트에 접근할 수 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  await test.step('할 일 목록 화면을 연다', async () => {
    await page.goto('https://demo.playwright.dev/todomvc');
    await verify('화면 제목 todos가 보인다', await page.getByRole('heading', { name: 'todos' }).isVisible(), true);
  });
});
