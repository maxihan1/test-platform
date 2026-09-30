import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'CDY-033',
  name: '테스트 회원 계정으로 로그인하면 홈(/main/)으로 가서 머리글의 「로그인」·「회원가입」이 없어지고 프로필 메뉴에 「내 정보」·「로그아웃」이 있으며 내 정보 화면에 제목 「내 정보」와 「회원탈퇴」·「홈으로」·「비밀번호 변경」·「내정보 변경하기」 버튼이 보인다',
  precondition: ['테스트 회원 계정이 있다'],
  params: z.object({
    loginId: z.string().min(1).describe('테스트 회원 이메일').optional(),
    loginPassword: z.string().min(1).describe('테스트 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    path: z.string().describe('로그인한 뒤 주소 경로').default('/main/'),
    loginLinkVisible: z.boolean().describe('머리글 「로그인」 링크가 보일지 여부').default(false),
    signupLinkVisible: z.boolean().describe('머리글 「회원가입」 링크가 보일지 여부').default(false),
    menuButtons: z.string().describe('프로필 메뉴의 버튼 이름을 쉼표로 이은 것').default('내 정보, 로그아웃'),
    title: z.string().describe('내 정보 화면 제목').default('내 정보'),
    buttons: z.string().describe('내 정보 화면에 보일 버튼 이름을 쉼표로 이은 것').default('회원탈퇴, 홈으로, 비밀번호 변경, 내정보 변경하기'),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 머리 = page.getByRole('banner');

  await test.step('로그인 화면에서 테스트 계정으로 로그인한다', async () => {
    await page.goto('/loginForm');
    await page.getByPlaceholder('이메일을 입력하세요.').fill(params.loginId ?? '');
    await page.getByPlaceholder('비밀번호를 입력하세요.').fill(params.loginPassword ?? '');
    await page.getByRole('button', { name: '로그인', exact: true }).click();
    await page.waitForURL(/\/main\//);
    await 머리.getByRole('button').waitFor();
    await verify(
      '로그인하면 홈(/main/)으로 가고 머리글의 「로그인」·「회원가입」 링크가 없어진다',
      {
        path: new URL(page.url()).pathname,
        loginLinkVisible: await 머리.getByRole('link', { name: '로그인', exact: true }).isVisible(),
        signupLinkVisible: await 머리.getByRole('link', { name: '회원가입', exact: true }).isVisible(),
      },
      { path: expected.path, loginLinkVisible: expected.loginLinkVisible, signupLinkVisible: expected.signupLinkVisible },
    );
  });

  await test.step('머리글의 프로필 단추를 누른다', async () => {
    await 머리.getByRole('button').click();
    await page.getByRole('button', { name: '로그아웃', exact: true }).waitFor();
    const 보이는버튼: string[] = [];
    for (const 이름 of expected.menuButtons.split(', ')) {
      if (await page.getByRole('button', { name: 이름, exact: true }).isVisible()) 보이는버튼.push(이름);
    }
    await verify('프로필 단추를 누르면 메뉴에 「내 정보」·「로그아웃」이 보인다', 보이는버튼.join(', '), expected.menuButtons);
  });

  await test.step('내 정보 화면을 연다', async () => {
    await page.goto('/myinfo/ams/list');
    await page.getByRole('heading', { level: 1 }).waitFor();
    const 보이는버튼: string[] = [];
    for (const 이름 of expected.buttons.split(', ')) {
      if (await page.getByRole('button', { name: 이름, exact: true }).isVisible()) 보이는버튼.push(이름);
    }
    await verify(
      '내 정보 화면에 제목 「내 정보」와 「회원탈퇴」·「홈으로」·「비밀번호 변경」·「내정보 변경하기」 버튼이 보인다',
      { title: await page.getByRole('heading', { level: 1 }).innerText(), buttons: 보이는버튼.join(', ') },
      { title: expected.title, buttons: expected.buttons },
    );
  });
});
