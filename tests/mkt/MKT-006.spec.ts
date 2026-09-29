import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-006',
  name: '없는 주소로 들어가면 「페이지를 찾을 수 없습니다」 제목과 「홈으로」 링크가 보인다',
  precondition: ['비회원이다'],
  params: z.object({
    path: z.string().min(1).describe('들어갈 없는 주소').default('/no-such-page-xyz'),
  }),
  expected: z.object({
    heading: z.string().describe('보여야 할 화면 제목').default('페이지를 찾을 수 없습니다'),
    homeLinkVisible: z.boolean().describe('「홈으로」가 보일지 여부').default(true),
  }),
  unconfirmed: '기획서는 「홈으로」를 버튼이라 적었는데 화면은 링크다 — 차이 D1 (작성 요청 5877)',
});

test(spec, async ({ page, params, expected }) => {
  await test.step('없는 주소로 들어간다', async () => {
    await page.goto(params.path);
    await page.getByRole('button', { name: '상담하기' }).waitFor();
    await verify(
      '없는 주소로 들어가면 「페이지를 찾을 수 없습니다」 제목과 「홈으로」 링크가 보인다',
      {
        제목: await page.getByRole('heading', { level: 1 }).innerText(),
        홈으로: await page.getByRole('main').getByRole('link', { name: '홈으로' }).isVisible(),
      },
      { 제목: expected.heading, 홈으로: expected.homeLinkVisible },
    );
  });
});
