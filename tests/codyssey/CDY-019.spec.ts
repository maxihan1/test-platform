import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'CDY-019',
  name: 'AI 네이티브 모집안내 화면에 소제목 「신청절차」·「지원 혜택」·「지원 시 유의사항」과 「공고문 바로보기」·「공고문 다운로드」·「FAQ」 버튼이 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: z.object({
    headings: z.string().describe('보일 제목과 소제목을 " | " 로 이은 것').default('AI 네이티브 | 신청절차 | 코디세이 AI 네이티브 과정을 통한 성장 | 지원 혜택 | 지원 시 유의사항'),
    buttons: z.string().describe('보일 버튼 이름을 쉼표로 이은 것').default('공고문 바로보기, 공고문 다운로드, FAQ'),
  }),
});

test(spec, async ({ page, expected }) => {
  await test.step('AI 네이티브 모집안내 화면을 연다', async () => {
    await page.goto('/guide/aiNative');
    await page.getByRole('heading', { name: '지원 시 유의사항', exact: true }).waitFor();
    const 보이는제목: string[] = [];
    for (const 이름 of expected.headings.split(' | ')) {
      if (await page.getByRole('heading', { name: 이름, exact: true }).first().isVisible()) 보이는제목.push(이름);
    }
    await verify(
      'AI 네이티브 모집안내 화면에 제목 「AI 네이티브」와 소제목 「신청절차」·「코디세이 AI 네이티브 과정을 통한 성장」·「지원 혜택」·「지원 시 유의사항」이 보인다',
      보이는제목.join(' | '),
      expected.headings,
    );
    const 보이는버튼: string[] = [];
    for (const 이름 of expected.buttons.split(', ')) {
      if (await page.getByRole('main').getByRole('button', { name: 이름, exact: true }).first().isVisible()) 보이는버튼.push(이름);
    }
    await verify('「공고문 바로보기」·「공고문 다운로드」·「FAQ」 버튼이 보인다', 보이는버튼.join(', '), expected.buttons);
  });
});
