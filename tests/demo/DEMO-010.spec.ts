import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'DEMO-010',
  name: '화면 가로 폭이 모바일 기준인 500px 미만이다',
  platforms: ['mobile'],
  precondition: ['할 일 목록 데모 사이트에 접근할 수 있다'],
  params: null,
  expected: z.object({
    mobileWidth: z.boolean().describe('가로 폭이 모바일 기준(500px 미만)인지').default(true),
  }),
});

test(spec, async ({ page, expected }) => {
  await test.step('할 일 목록 화면을 연다', async () => {
    await page.goto('https://demo.playwright.dev/todomvc');
    await verify('화면 제목 todos가 보인다', await page.getByRole('heading', { name: 'todos' }).isVisible(), true);
  });

  await test.step('화면 가로 폭을 확인한다', async () => {
    const width = page.viewportSize()?.width ?? 0;
    await verify('가로 폭이 500px 미만이다', width < 500, expected.mobileWidth);
  });
});
