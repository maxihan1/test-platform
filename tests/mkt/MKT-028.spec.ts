import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-028',
  name: '게시글 상세에서 「목록」을 누르면 들어오기 전의 질문 분류 목록으로 돌아간다',
  precondition: ['「질문」 분류 목록에서 글 상세로 들어왔다'],
  params: z.object({
    category: z.string().min(1).describe('들어올 때 고른 분류 탭').default('질문'),
  }),
  expected: z.object({
    listPath: z.string().describe('돌아갈 목록 주소').default('/board'),
    selected: z.string().describe('돌아간 목록에서 선택되어 있을 분류 탭').default('질문'),
  }),
  unconfirmed: '기획서는 「목록」을 버튼이라 적었는데 화면은 링크다 — 차이 D3 (작성 요청 5877)',
});

test(spec, async ({ page, params, expected }) => {
  await test.step('질문 분류 목록에서 글 상세로 들어간다', async () => {
    await page.goto('/board');
    await page.getByRole('row').getByRole('link').first().waitFor();
    const 쿠키띠 = page.getByRole('region', { name: '쿠키 안내' });
    await 쿠키띠.waitFor();
    await 쿠키띠.getByRole('button', { name: '동의' }).click();
    await page.getByRole('tab', { name: params.category, exact: true }).click();
    await page.locator('#board .skel-row').first().waitFor();
    await page.locator('#board .skel-row').first().waitFor({ state: 'detached' });
    await page.getByRole('row').getByRole('link').first().click();
  });

  await test.step('게시글 상세가 열렸는지 확인한다', async () => {
    const 목록 = page.getByRole('main').getByRole('link', { name: '목록' });
    await 목록.waitFor();
    await verify('게시글 상세에 「목록」이 보인다', await 목록.isVisible(), true, { blocker: true });
  });

  await test.step('「목록」을 누른다', async () => {
    await page.getByRole('main').getByRole('link', { name: '목록' }).click();
    await page.getByRole('row').getByRole('link').first().waitFor();
    await verify(
      '게시글 상세에서 「목록」을 누르면 들어오기 전의 질문 분류 목록으로 돌아간다',
      {
        주소: new URL(page.url()).pathname,
        선택된탭: await page.getByRole('tab', { selected: true }).innerText(),
      },
      { 주소: expected.listPath, 선택된탭: expected.selected },
    );
  });
});
