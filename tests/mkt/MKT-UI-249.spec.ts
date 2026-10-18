import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 기본회원으로로그인, 세션회원있는가 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 회원정보수정화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-249',
  name: '회원정보 수정에 들어가면 먼저 비밀번호 입력칸과 「비밀번호 확인」 버튼이 보인다',
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
    await verify(
      '회원정보 수정에 들어가면 먼저 비밀번호 입력칸과 「비밀번호 확인」 버튼이 보인다',
      { 비밀번호칸: await 수정.비밀번호칸.isVisible(), 확인버튼: await 수정.비밀번호확인버튼.isVisible(), 수정칸: await 수정.이름칸.isVisible() },
      { 비밀번호칸: true, 확인버튼: true, 수정칸: false },
    );
  });
});
