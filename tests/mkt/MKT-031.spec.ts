import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-031',
  name: '한 화면 이상 내리면 「맨 위로」 버튼이 나타나고 누르면 맨 위로 올라간다',
  precondition: ['게시판 목록이 한 화면 높이 이상 내려갈 만큼 긴 창으로 열려 있다'],
  params: z.object({
    windowHeight: z.number().int().positive().describe('창 높이(px) — 목록이 한 화면 이상 내려가도록 줄인다').default(400),
  }),
  expected: z.object({
    topButtonVisible: z.boolean().describe('한 화면 이상 내렸을 때 「맨 위로」가 보일지 여부').default(true),
    topY: z.number().describe('「맨 위로」를 누른 뒤 내린 값(px)').default(0),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 맨위로 = page.getByRole('button', { name: '맨 위로' });

  await test.step('창 높이를 줄이고 게시판 목록을 연다', async () => {
    await page.setViewportSize({ width: page.viewportSize()?.width ?? 1280, height: params.windowHeight });
    await page.goto('/board');
    await page.locator('#board .skel-row').first().waitFor({ state: 'detached' });
    await page.getByRole('button', { name: '상담하기' }).waitFor();
    await verify(
      '게시판 목록이 한 화면 높이 이상 내려갈 만큼 긴 창으로 열려 있다',
      await page.evaluate(() => document.documentElement.scrollHeight - innerHeight >= innerHeight),
      true,
      { blocker: true },
    );
  });

  await test.step('화면을 한 화면 높이만큼 내린다', async () => {
    await page.evaluate(() => scrollTo(0, innerHeight));
    await page.locator('#site-header.stuck').waitFor();
    await verify('페이지를 한 화면 이상 내리면 「맨 위로」 버튼이 보인다', await 맨위로.isVisible(), expected.topButtonVisible);
  });

  await test.step('「맨 위로」를 누른다', async () => {
    const 멈춤 = await page.evaluateHandle(() => ({
      자리: new Promise<number>((resolve) => addEventListener('scrollend', () => resolve(scrollY), { once: true })),
    }));
    await 맨위로.click();
    await verify('「맨 위로」를 누르면 맨 위로 올라간다', await 멈춤.evaluate((m) => m.자리), expected.topY);
  });
});
