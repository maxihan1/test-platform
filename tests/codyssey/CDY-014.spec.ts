import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'CDY-014',
  name: '교육과정 화면에 제목 「교육과정」과 소제목 「교육안내」·「AI 올인원 과정 (최대 18개월)」·「AI 네이티브 과정 (최대 5개월)」이 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: z.object({
    headings: z.string().describe('제목과 소제목을 " | " 로 이은 것').default('교육과정 | 교육안내 | AI 올인원 과정 (최대 18개월) | AI 네이티브 과정 (최대 5개월)'),
  }),
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page, expected }) => {
  const 이름들 = expected.headings.split(' | ');
  await test.step('교육과정 화면을 연다', async () => {
    await page.goto('/apply/course');
    await page.getByRole('heading', { name: 이름들.at(-1) ?? '', exact: true }).first().waitFor();
    const 보이는것: string[] = [];
    for (const 이름 of 이름들) {
      if (await page.getByRole('heading', { name: 이름, exact: true }).first().isVisible()) 보이는것.push(이름);
    }
    await verify('교육과정 화면에 제목 「교육과정」과 소제목 「교육안내」·「AI 올인원 과정 (최대 18개월)」·「AI 네이티브 과정 (최대 5개월)」이 보인다', 보이는것.join(' | '), expected.headings);
  });
});
