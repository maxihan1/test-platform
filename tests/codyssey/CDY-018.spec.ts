import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'CDY-018',
  name: 'AI 올인원 모집안내 화면에 제목 「AI 올인원」과 소제목 「코디세이 AI 올인원 과정을 통한 성장」·「지원 혜택」·「지원 시 유의사항」이 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: z.object({
    headings: z.string().describe('제목과 소제목을 " | " 로 이은 것').default('AI 올인원 | 코디세이 AI 올인원 과정을 통한 성장 | 지원 혜택 | 지원 시 유의사항'),
  }),
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page, expected }) => {
  const 이름들 = expected.headings.split(' | ');
  await test.step('AI 올인원 모집안내 화면을 연다', async () => {
    await page.goto('/guide/recruitmentNotice');
    await page.getByRole('heading', { name: 이름들.at(-1) ?? '', exact: true }).first().waitFor();
    const 보이는것: string[] = [];
    for (const 이름 of 이름들) {
      if (await page.getByRole('heading', { name: 이름, exact: true }).first().isVisible()) 보이는것.push(이름);
    }
    await verify('AI 올인원 모집안내 화면에 제목 「AI 올인원」과 소제목 「코디세이 AI 올인원 과정을 통한 성장」·「지원 혜택」·「지원 시 유의사항」이 보인다', 보이는것.join(' | '), expected.headings);
  });
});
