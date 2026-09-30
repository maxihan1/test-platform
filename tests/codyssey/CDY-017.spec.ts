import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'CDY-017',
  name: '지원혜택 화면에 제목 「지원혜택」과 소제목 「누구에게나 열려 있는 기회」·「AX시대, 도전과 설렘을 현실로!」·「소개 영상」이 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: z.object({
    headings: z.string().describe('제목과 소제목을 " | " 로 이은 것').default('지원혜택 | 누구에게나 열려 있는 기회 | AX시대, 도전과 설렘을 현실로! | 소개 영상'),
  }),
});

test(spec, async ({ page, expected }) => {
  const 이름들 = expected.headings.split(' | ');
  await test.step('지원혜택 화면을 연다', async () => {
    await page.goto('/apply/benefits');
    await page.getByRole('heading', { name: 이름들.at(-1) ?? '', exact: true }).first().waitFor();
    const 보이는것: string[] = [];
    for (const 이름 of 이름들) {
      if (await page.getByRole('heading', { name: 이름, exact: true }).first().isVisible()) 보이는것.push(이름);
    }
    await verify('지원혜택 화면에 제목 「지원혜택」과 소제목 「누구에게나 열려 있는 기회」·「AX시대, 도전과 설렘을 현실로!」·「소개 영상」이 보인다', 보이는것.join(' | '), expected.headings);
  });
});
