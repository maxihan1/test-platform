import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'CDY-030',
  name: '길 잃음 화면에 「항로를 이탈하였습니다.」와 「이전」·「홈으로」 버튼이 보이고 「홈으로」를 누르면 홈으로 간다',
  precondition: ['비회원이다'],
  params: null,
  expected: z.object({
    title: z.string().describe('길 잃음 화면 제목').default('항로를 이탈하였습니다.'),
    buttons: z.string().describe('보일 버튼 이름을 쉼표로 이은 것').default('이전, 홈으로'),
    homePath: z.string().describe('「홈으로」를 누른 뒤 주소 경로').default('/'),
  }),
});

test(spec, async ({ page, expected }) => {
  await test.step('길 잃음 화면을 연다', async () => {
    await page.goto('/404-not-found');
    await page.getByRole('button', { name: '홈으로', exact: true }).waitFor();
    const 보이는버튼: string[] = [];
    for (const 이름 of expected.buttons.split(', ')) {
      if (await page.getByRole('button', { name: 이름, exact: true }).isVisible()) 보이는버튼.push(이름);
    }
    await verify(
      '길 잃음 화면에 「항로를 이탈하였습니다.」와 「이전」·「홈으로」 버튼이 보인다',
      { title: await page.getByRole('heading', { level: 2 }).innerText(), buttons: 보이는버튼.join(', ') },
      { title: expected.title, buttons: expected.buttons },
    );
  });

  await test.step('「홈으로」를 누른다', async () => {
    await page.getByRole('button', { name: '홈으로', exact: true }).click();
    await page.getByRole('main').getByRole('button', { name: '교육과정 신청하기' }).waitFor();
    await verify('「홈으로」를 누르면 홈으로 간다', new URL(page.url()).pathname, expected.homePath);
  });
});
