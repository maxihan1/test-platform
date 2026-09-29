import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'CDY-003',
  name: '머리글에 로고 링크와 메뉴 「코디세이란」·「과정소개」·「모집안내」·「알림마당」, 「회원가입」·「로그인」 링크가 보인다',
  precondition: ['비회원으로 홈에 들어와 있다'],
  params: null,
  expected: z.object({
    logoVisible: z.boolean().describe('로고 링크가 보일지 여부').default(true),
    menus: z.string().describe('보일 메뉴 이름을 쉼표로 이은 것').default('코디세이란, 과정소개, 모집안내, 알림마당'),
    signupVisible: z.boolean().describe('「회원가입」 링크가 보일지 여부').default(true),
    loginVisible: z.boolean().describe('「로그인」 링크가 보일지 여부').default(true),
  }),
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page, expected }) => {
  await test.step('머리글을 본다', async () => {
    await page.goto('/');
    const 머리 = page.getByRole('banner');
    await 머리.getByRole('link', { name: '로그인', exact: true }).waitFor();
    const 보이는메뉴: string[] = [];
    for (const 이름 of expected.menus.split(', ')) {
      if (await 머리.getByRole('link', { name: 이름, exact: true }).first().isVisible()) 보이는메뉴.push(이름);
    }
    await verify(
      '머리글에 로고 링크와 메뉴 「코디세이란」·「과정소개」·「모집안내」·「알림마당」, 「회원가입」·「로그인」 링크가 보인다',
      {
        logoVisible: await 머리.getByRole('link', { name: 'Codyssey' }).first().isVisible(),
        menus: 보이는메뉴.join(', '),
        signupVisible: await 머리.getByRole('link', { name: '회원가입', exact: true }).isVisible(),
        loginVisible: await 머리.getByRole('link', { name: '로그인', exact: true }).isVisible(),
      },
      { logoVisible: expected.logoVisible, menus: expected.menus, signupVisible: expected.signupVisible, loginVisible: expected.loginVisible },
    );
  });
});
