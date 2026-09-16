import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'DEMO-009',
  name: '화면 가로 폭이 데스크톱 기준인 700px 이상이다',
  platforms: ['desktop', 'mobile'],
  precondition: ['할 일 목록 데모 사이트에 접근할 수 있다'],
  params: null,
  expected: z.object({
    desktopWidth: z.boolean().describe('가로 폭이 데스크톱 기준(700px 이상)인지').default(true),
  }),
});

test(spec, async ({ page, expected }) => {
  await test.step('할 일 목록 화면을 연다', async () => {
    await page.goto('https://demo.playwright.dev/todomvc');
    await verify('화면 제목 todos가 보인다', await page.getByRole('heading', { name: 'todos' }).isVisible(), true);
  });

  await test.step('화면 가로 폭을 확인한다', async () => {
    const width = page.viewportSize()?.width ?? 0;
    await verify('가로 폭이 700px 이상이다', width >= 700, expected.desktopWidth);
  });
});
