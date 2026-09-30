import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'CDY-006',
  name: '「교육과정 신청하기」를 누르면 모집안내 「AI 올인원」 화면이 열린다',
  precondition: ['비회원으로 홈에 들어와 있다'],
  params: null,
  expected: z.object({
    title: z.string().describe('열린 화면의 제목').default('AI 올인원'),
    path: z.string().describe('열린 화면의 주소 경로').default('/guide/recruitmentNotice'),
  }),
});

test(spec, async ({ page, expected }) => {
  await test.step('홈을 열고 공지 팝업을 닫는다', async () => {
    await page.goto('/');
    const 팝업 = page.getByRole('dialog');
    await 팝업.first().waitFor();
    while ((await 팝업.count()) > 0) {
      await 팝업.getByRole('button', { name: '닫기' }).first().click();
    }
    await page.getByRole('main').getByRole('button', { name: '교육과정 신청하기' }).waitFor();
  });

  await test.step('「교육과정 신청하기」를 누른다', async () => {
    await page.getByRole('main').getByRole('button', { name: '교육과정 신청하기' }).click();
    await page.getByRole('heading', { name: '지원 시 유의사항', exact: true }).waitFor();
    await verify(
      '「교육과정 신청하기」를 누르면 모집안내 「AI 올인원」 화면이 열린다',
      {
        title: await page.getByRole('heading', { level: 1 }).innerText(),
        path: new URL(page.url()).pathname,
      },
      { title: expected.title, path: expected.path },
    );
  });
});
