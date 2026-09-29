import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'CDY-034',
  name: '내 정보 화면에 제목 「내 정보」와 「회원탈퇴」·「홈으로」·「비밀번호 변경」·「내정보 변경하기」 버튼이 보인다',
  precondition: ['테스트 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().min(1).describe('테스트 회원 이메일').optional(),
    loginPassword: z.string().min(1).describe('테스트 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    title: z.string().describe('화면 제목').default('내 정보'),
    buttons: z.string().describe('보일 버튼 이름을 쉼표로 이은 것').default('회원탈퇴, 홈으로, 비밀번호 변경, 내정보 변경하기'),
  }),
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page, params, expected }) => {
  await test.step('로그인 화면에서 테스트 계정으로 로그인한다', async () => {
    await page.goto('/loginForm');
    await page.getByPlaceholder('이메일을 입력하세요.').fill(params.loginId ?? '');
    await page.getByPlaceholder('비밀번호를 입력하세요.').fill(params.loginPassword ?? '');
    await page.getByRole('button', { name: '로그인', exact: true }).click();
    await page.waitForURL(/\/main\//);
    await page.getByRole('banner').getByRole('button').waitFor();
    await verify('테스트 회원으로 로그인해 홈(/main/)에 와 있다', new URL(page.url()).pathname, '/main/', { blocker: true });
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
