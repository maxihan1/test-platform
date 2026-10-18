import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 기본회원으로로그인, 세션회원있는가 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 회원탈퇴화면 } from './pages/withdraw.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-334',
  name: '「위 내용을 확인했습니다」를 켜면 「탈퇴하기」가 눌린다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 탈퇴 = new 회원탈퇴화면(page);

  await test.step('회원으로 로그인한다', async () => {
    await 방해창막기(page);
    await 기본회원으로로그인(page.request, params.loginId ?? '', params.loginPassword ?? '');
  });

  await test.step('로그인한 상태를 확인한다', async () => {
    await verify('세션에 회원이 있다', await 세션회원있는가(page.request), true, { blocker: true });
  });

  await test.step('회원 탈퇴 화면을 연다', async () => {
    await 탈퇴.열기();
  });

  await test.step('회원 탈퇴 화면이 열렸는지 확인한다', async () => {
    await verify('「탈퇴하기」 버튼이 보인다', await 탈퇴.탈퇴버튼.isVisible(), true, { blocker: true });
  });

  await test.step('회원 탈퇴 화면에서 「위 내용을 확인했습니다」를 켠다', async () => {
    await 탈퇴.동의켜기();
    await verify('「위 내용을 확인했습니다」를 켜면 「탈퇴하기」가 눌린다', await 탈퇴.탈퇴버튼.isEnabled(), true);
  });
});
