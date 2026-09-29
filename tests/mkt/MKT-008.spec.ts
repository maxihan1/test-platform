import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-008',
  name: '화면을 100px 내리면 머리글 높이가 48px로 줄어든다',
  precondition: ['게시판 목록을 열고 아직 내리지 않았다'],
  params: null,
  expected: z.object({
    restHeight: z.number().describe('내리기 전 머리글 높이(px)').default(64),
    stuckHeight: z.number().describe('내린 뒤 머리글 높이(px)').default(48),
  }),
});

test(spec, async ({ page, expected }) => {
  const 머리글 = page.getByRole('banner');
  const 높이 = async (): Promise<number> => 머리글.evaluate((el) => el.clientHeight);

  await test.step('내리기 전 머리글 높이를 본다', async () => {
    await page.goto('/board');
    await 머리글.getByRole('navigation', { name: '주 메뉴' }).getByRole('link').first().waitFor();
    await verify('내리기 전 머리글 높이가 64px이다', await 높이(), expected.restHeight, { blocker: true });
  });

  await test.step('화면을 100px 내린다', async () => {
    await page.mouse.wheel(0, 100);
    await page.locator('#site-header.stuck').waitFor();
    await 머리글.evaluate((el) => Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished)));
    await verify('화면을 100px 내리면 머리글 높이가 48px로 줄어든다', await 높이(), expected.stuckHeight);
  });
});
