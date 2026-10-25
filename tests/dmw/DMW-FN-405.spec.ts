import { defineCase, test, verify } from '@platform/kit';

import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-405',
  name: '모달이 열려 있는 동안 뒤 화면이 스크롤되지 않는다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 가입 = new 회원가입화면(page);
  const 약관창 = 가입.약관창('이용약관');
  await 안내창막기(page);

  await test.step('회원가입 화면에서 약관 모달을 연다', async () => {
    await 가입.열기();
    await 가입.약관보기('이용약관').click();
    await 약관창.뜰때까지();
    await verify('비회원이다', await 가입.머리.로그인.isVisible(), true, { blocker: true });
    await verify('약관 모달이 보인다', await 약관창.창.isVisible(), true, { blocker: true });
  });

  await test.step('약관 모달을 연 채 화면을 내린다', async () => {
    await 가입.맨위로올리기();
    await verify('화면이 맨 위에 있다', await 가입.내린거리(), 0, { blocker: true });
    await page.keyboard.press('PageDown');
    await 가입.화면이밀린만큼기다리기();
    await verify('모달이 열려 있는 동안 뒤 화면이 스크롤되지 않는다', await 가입.내린거리(), 0);
  });
});
