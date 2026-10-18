import { defineCase, test, verify } from '@platform/kit';
import { 새회원으로로그인, 세션회원있는가, 회원정리, type 회원정보 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-555',
  name: '탈퇴한 아이디로 로그인하면 로그인되지 않는다',
  platforms: ['desktop', 'mobile'],
  precondition: ['새로 가입한 회원이 탈퇴했다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 로그인 = new 로그인화면(page);
  const 준비: { 회원?: 회원정보; 탈퇴응답?: number } = {};

  await test.step('새로 가입한 회원이 탈퇴한다', async () => {
    await 방해창막기(page);
    준비.회원 = await 새회원으로로그인(page.request);
    준비.탈퇴응답 = await 회원정리(page.request, 준비.회원);
  });

  await test.step('탈퇴한 회원인지 확인한다', async () => {
    await verify('탈퇴 요청이 성공한다', 준비.탈퇴응답, 204, { blocker: true });
    await verify('세션에 회원이 없다', await 세션회원있는가(page.request), false, { blocker: true });
  });

  await test.step('탈퇴한 아이디로 로그인한다', async () => {
    await 로그인.열기();
    await 로그인.로그인하기(준비.회원?.loginId ?? '', 준비.회원?.password ?? '');
    await 로그인.오류.waitFor();
    await verify('탈퇴한 아이디로 로그인하면 로그인되지 않는다', await 세션회원있는가(page.request), false);
  });
});
