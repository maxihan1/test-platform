import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'CDY-013',
  name: '캠퍼스 안내 화면에 소제목 「공간 소개」·「층별 안내」·「캠퍼스 소개영상」·「오시는 길」이 보이고 서울·대전·경남 「GO」 링크가 각 캠퍼스 안내로 이어진다',
  precondition: ['비회원이다'],
  params: null,
  expected: z.object({
    headings: z.string().describe('보일 소제목을 " | " 로 이은 것').default('공간 소개 | 층별 안내 | 캠퍼스 소개영상 | 오시는 길'),
    goLinks: z.string().describe('「GO」 링크 주소를 쉼표로 이은 것').default('/about/campus, /daejeon/about/campus, /gyeongnam/about/campus'),
  }),
});

test(spec, async ({ page, expected }) => {
  await test.step('캠퍼스 안내 화면을 연다', async () => {
    await page.goto('/about/campus');
    await page.getByRole('heading', { name: '오시는 길', exact: true }).waitFor();
    const 보이는것: string[] = [];
    for (const 이름 of expected.headings.split(' | ')) {
      if (await page.getByRole('heading', { name: 이름, exact: true }).first().isVisible()) 보이는것.push(이름);
    }
    await verify('캠퍼스 안내 화면에 소제목 「공간 소개」·「층별 안내」·「캠퍼스 소개영상」·「오시는 길」이 보인다', 보이는것.join(' | '), expected.headings);
    const 주소들 = await page.getByRole('link', { name: 'GO', exact: true }).evaluateAll((링크) => 링크.map((a) => a.getAttribute('href') ?? ''));
    await verify('서울·대전·경남 「GO」 링크가 각 캠퍼스 안내로 이어진다', 주소들.join(', '), expected.goLinks);
  });
});
