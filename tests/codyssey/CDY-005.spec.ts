import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'CDY-005',
  name: '지역 목록에 「서울」·「대전」·「경남」 캠퍼스 링크가 보인다',
  precondition: ['비회원으로 홈에 들어와 있다'],
  params: null,
  expected: z.object({
    regions: z.string().describe('보일 지역 이름을 쉼표로 이은 것').default('서울, 대전, 경남'),
  }),
});

test(spec, async ({ page, expected }) => {
  const 머리 = page.getByRole('banner');

  await test.step('홈을 열고 공지 팝업을 닫는다', async () => {
    await page.goto('/');
    const 팝업 = page.getByRole('dialog');
    await 팝업.first().waitFor();
    while ((await 팝업.count()) > 0) {
      await 팝업.getByRole('button', { name: '닫기' }).first().click();
    }
    await 머리.getByRole('link', { name: '로그인', exact: true }).waitFor();
  });

  await test.step('머리글 지역 단추 「서울」을 누른다', async () => {
    await 머리.getByRole('button', { name: '서울' }).click();
    await 머리.getByRole('link', { name: /^경남/ }).waitFor();
    const 보이는지역: string[] = [];
    for (const 이름 of expected.regions.split(', ')) {
      if (await 머리.getByRole('link', { name: new RegExp(`^${이름}`) }).first().isVisible()) 보이는지역.push(이름);
    }
    await verify('지역 목록에 「서울」·「대전」·「경남」 캠퍼스 링크가 보인다', 보이는지역.join(', '), expected.regions);
  });
});
