import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'CDY-031',
  name: '로그인 화면에 이메일 칸과 가려진 비밀번호 칸, 「로그인」·「회원가입」 버튼, 「비밀번호 찾기」 링크가 있다',
  precondition: ['비회원이다'],
  params: null,
  expected: z.object({
    title: z.string().describe('화면 제목').default('로그인'),
    emailVisible: z.boolean().describe('이메일 칸이 보일지 여부').default(true),
    passwordType: z.string().describe('비밀번호 칸의 입력 종류').default('password'),
    buttons: z.string().describe('보일 버튼 이름을 쉼표로 이은 것').default('로그인, 회원가입'),
    findPasswordHref: z.string().describe('「비밀번호 찾기」 링크 주소').default('/pwd/PwdSch'),
  }),
});

test(spec, async ({ page, expected }) => {
  await test.step('로그인 화면을 연다', async () => {
    await page.goto('/loginForm');
    const 비밀번호칸 = page.getByPlaceholder('비밀번호를 입력하세요.');
    await 비밀번호칸.waitFor();
    const 보이는버튼: string[] = [];
    for (const 이름 of expected.buttons.split(', ')) {
      if (await page.getByRole('button', { name: 이름, exact: true }).isVisible()) 보이는버튼.push(이름);
    }
    await verify(
      '로그인 화면에 이메일 칸과 가려진 비밀번호 칸, 「로그인」·「회원가입」 버튼, 「비밀번호 찾기」 링크가 있다',
      {
        title: await page.getByRole('heading', { name: expected.title, exact: true }).innerText(),
        emailVisible: await page.getByPlaceholder('이메일을 입력하세요.').isVisible(),
        passwordType: (await 비밀번호칸.getAttribute('type')) ?? '',
        buttons: 보이는버튼.join(', '),
        findPasswordHref: (await page.getByRole('link', { name: '비밀번호 찾기', exact: true }).getAttribute('href')) ?? '',
      },
      {
        title: expected.title,
        emailVisible: expected.emailVisible,
        passwordType: expected.passwordType,
        buttons: expected.buttons,
        findPasswordHref: expected.findPasswordHref,
      },
    );
  });
});
