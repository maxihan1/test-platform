import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 기본회원으로로그인, 세션회원있는가 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 회원정보수정화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-251',
  name: '회원정보 수정의 아이디 칸은 흐리게 보이고 고칠 수 없다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 수정 = new 회원정보수정화면(page);

  await test.step('회원으로 로그인한다', async () => {
    await 방해창막기(page);
    await 기본회원으로로그인(page.request, params.loginId ?? '', params.loginPassword ?? '');
  });

  await test.step('로그인한 상태를 확인한다', async () => {
    await verify('세션에 회원이 있다', await 세션회원있는가(page.request), true, { blocker: true });
  });

  await test.step('회원정보 수정 화면을 연다', async () => {
    await 수정.열기();
    await verify('비밀번호 입력칸이 보인다', await 수정.비밀번호칸.isVisible(), true, { blocker: true });
  });

  await test.step('비밀번호를 다시 입력한 뒤 아이디 칸을 확인한다', async () => {
    await 수정.비밀번호확인하기(params.loginPassword ?? '');
    await verify(
      '회원정보 수정의 아이디 칸은 흐리게 보이고 고칠 수 없다',
      { 흐림: await 수정.아이디칸흐린가(), 고칠수없음: await 수정.아이디칸.isDisabled() },
      { 흐림: true, 고칠수없음: true },
    );
  });
});
