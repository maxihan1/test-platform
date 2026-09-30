import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'CDY-012',
  name: '코디세이 소개 화면에 제목 「코디세이 소개」와 소제목 「교육 인재상」·「코디세이란?」·「학습 프로세스」·「학습진도관리」가 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: z.object({
    headings: z.string().describe('제목과 소제목을 " | " 로 이은 것').default('코디세이 소개 | 교육 인재상 | 코디세이란? | 학습 프로세스 | 학습진도관리'),
  }),
});

test(spec, async ({ page, expected }) => {
  const 이름들 = expected.headings.split(' | ');
  await test.step('코디세이 소개 화면을 연다', async () => {
    await page.goto('/about/intro');
    await page.getByRole('heading', { name: 이름들.at(-1) ?? '', exact: true }).first().waitFor();
    const 보이는것: string[] = [];
    for (const 이름 of 이름들) {
      if (await page.getByRole('heading', { name: 이름, exact: true }).first().isVisible()) 보이는것.push(이름);
    }
    await verify('코디세이 소개 화면에 제목 「코디세이 소개」와 소제목 「교육 인재상」·「코디세이란?」·「학습 프로세스」·「학습진도관리」가 보인다', 보이는것.join(' | '), expected.headings);
  });
});
