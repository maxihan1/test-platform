import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-035',
  name: '화면 너비가 768px 이하면 메뉴가 햄버거 버튼으로 접히고 누르면 왼쪽에서 밀려 나온다',
  precondition: ['화면 너비가 768px 이하인 기기로 게시판 목록을 열었다'],
  platforms: ['mobile'],
  params: null,
  expected: z.object({
    maxWidth: z.number().describe('메뉴가 접히는 최대 화면 너비(px)').default(768),
    hamburgerVisible: z.boolean().describe('햄버거 버튼이 보일지 여부').default(true),
    menuHidden: z.boolean().describe('누르기 전 메뉴가 화면 밖에 있을지 여부').default(true),
    menuLeft: z.number().describe('누른 뒤 메뉴 왼쪽 끝 위치(px)').default(0),
  }),
});

test(spec, async ({ page, expected }) => {
  const 햄버거 = page.getByRole('button', { name: '메뉴 열기' });
  const 메뉴 = page.getByRole('navigation', { name: '주 메뉴' });

  await test.step('게시판 목록을 연다', async () => {
    await page.goto('/board');
    await 메뉴.getByRole('link').first().waitFor();
    await verify(
      '화면 너비가 768px 이하인 기기로 게시판 목록을 열었다',
      (page.viewportSize()?.width ?? Infinity) <= expected.maxWidth,
      true,
      { blocker: true },
    );
    const 상자 = await 메뉴.boundingBox();
    await verify(
      '화면 너비가 768px 이하면 메뉴가 햄버거 버튼 하나로 접힌다',
      { 햄버거: await 햄버거.isVisible(), 메뉴가화면밖: 상자 !== null && 상자.x + 상자.width <= 0 },
      { 햄버거: expected.hamburgerVisible, 메뉴가화면밖: expected.menuHidden },
    );
  });

  await test.step('햄버거 버튼을 누른다', async () => {
    await 햄버거.click();
    await 메뉴.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
    await verify('햄버거 버튼을 누르면 메뉴가 왼쪽에서 밀려 나온다', (await 메뉴.boundingBox())?.x, expected.menuLeft);
  });
});
