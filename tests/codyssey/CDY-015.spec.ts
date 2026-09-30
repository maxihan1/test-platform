import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'CDY-015',
  name: '교육 콘텐츠 알아보기 화면에 제목 「교육 콘텐츠 알아보기」와 소제목 「7대 도메인 분야」·「AI·SW 기초 학습」·「AI·SW 심화 학습」·「AI·SW 응용 학습」이 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: z.object({
    headings: z.string().describe('제목과 소제목을 " | " 로 이은 것').default('교육 콘텐츠 알아보기 | 7대 도메인 분야 | AI·SW 기초 학습 | AI·SW 심화 학습 | AI·SW 응용 학습'),
  }),
});

test(spec, async ({ page, expected }) => {
  const 이름들 = expected.headings.split(' | ');
  await test.step('교육 콘텐츠 알아보기 화면을 연다', async () => {
    await page.goto('/apply/educationContent');
    await page.getByRole('heading', { name: 이름들.at(-1) ?? '', exact: true }).first().waitFor();
    const 보이는것: string[] = [];
    for (const 이름 of 이름들) {
      if (await page.getByRole('heading', { name: 이름, exact: true }).first().isVisible()) 보이는것.push(이름);
    }
    await verify('교육 콘텐츠 알아보기 화면에 제목 「교육 콘텐츠 알아보기」와 소제목 「7대 도메인 분야」·「AI·SW 기초 학습」·「AI·SW 심화 학습」·「AI·SW 응용 학습」이 보인다', 보이는것.join(' | '), expected.headings);
  });
});
