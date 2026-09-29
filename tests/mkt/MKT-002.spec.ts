import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-002',
  name: '커뮤니티 메뉴에 마우스를 올리면 하위 메뉴가 펼쳐지고 「질문게시판」을 누르면 질문 분류가 선택된 목록으로 간다',
  precondition: ['비회원으로 게시판 목록에 들어와 있다', '커뮤니티 하위 메뉴가 펼쳐져 있다'],
  params: null,
  expected: z.object({
    subMenus: z.string().describe('펼쳐질 하위 메뉴 이름을 쉼표로 이은 것').default('자유게시판, 질문게시판, 후기게시판'),
    selectedTab: z.string().describe('하위 메뉴를 누른 뒤 선택될 분류 탭').default('질문'),
  }),
});

test(spec, async ({ page, expected }) => {
  await test.step('머리글 메뉴 「커뮤니티」에 마우스를 올린다', async () => {
    await page.goto('/board');
    const 주메뉴 = page.getByRole('navigation', { name: '주 메뉴' });
    await 주메뉴.getByRole('link', { name: '커뮤니티' }).hover();
    await page.getByRole('menuitem', { name: '자유게시판' }).waitFor({ state: 'visible' });
    const 보이는것: string[] = [];
    for (const 이름 of expected.subMenus.split(', ')) {
      if (await page.getByRole('menuitem', { name: 이름 }).isVisible()) 보이는것.push(이름);
    }
    await verify('하위 메뉴 「자유게시판」·「질문게시판」·「후기게시판」이 보인다', 보이는것.join(', '), expected.subMenus);
  });

  await test.step('하위 메뉴 「질문게시판」을 누른다', async () => {
    await page.getByRole('menuitem', { name: '질문게시판' }).click();
    await page.getByRole('row').getByRole('link').first().waitFor();
    await verify(
      '게시판 목록의 분류 탭 「질문」이 선택되어 있다',
      await page.getByRole('tab', { name: expected.selectedTab, exact: true }).getAttribute('aria-selected'),
      'true',
    );
  });
});
