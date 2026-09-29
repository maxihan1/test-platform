import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-009',
  name: '처음 방문하면 쿠키 안내 띠가 보이고 동의하면 사라져 새로 고쳐도 다시 나오지 않는다',
  precondition: ['이 브라우저로 처음 방문한다', '쿠키 안내 띠가 보인다', '쿠키 안내에 동의했다'],
  params: null,
  expected: z.object({
    message: z.string().describe('쿠키 안내 띠 문구').default('서비스 개선을 위해 쿠키를 사용합니다.'),
    agreeVisible: z.boolean().describe('「동의」 버튼이 처음에 보일지 여부').default(true),
    barVisibleAfter: z.boolean().describe('동의한 뒤 띠가 보일지 여부').default(false),
  }),
});

test(spec, async ({ page, expected }) => {
  const 띠 = page.getByRole('region', { name: '쿠키 안내' });

  await test.step('게시판 목록을 연다', async () => {
    await page.goto('/board');
    await 띠.waitFor();
    await verify(
      '쿠키 안내 띠 「서비스 개선을 위해 쿠키를 사용합니다.」와 「동의」 버튼이 보인다',
      {
        문구: await 띠.getByText(expected.message).innerText(),
        동의: await 띠.getByRole('button', { name: '동의' }).isVisible(),
      },
      { 문구: expected.message, 동의: expected.agreeVisible },
    );
  });

  await test.step('「동의」를 누른다', async () => {
    await 띠.getByRole('button', { name: '동의' }).click();
    await page.getByRole('row').getByRole('link').first().waitFor();
    await verify('「동의」를 누르면 쿠키 안내 띠가 사라진다', await 띠.isVisible(), expected.barVisibleAfter);
  });

  await test.step('게시판 목록을 새로 고친다', async () => {
    await page.reload();
    await page.getByRole('row').getByRole('link').first().waitFor();
    await verify('새로 고쳐도 쿠키 안내 띠가 다시 나오지 않는다', await 띠.isVisible(), expected.barVisibleAfter);
  });
});
