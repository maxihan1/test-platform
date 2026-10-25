import { defineCase, test, verify } from '@platform/kit';

import { 두프레임기다리기 } from './helpers/common-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-406',
  name: '모달을 닫으면 모달을 연 「보기」 버튼으로 초점이 돌아간다',
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

  await test.step('약관 모달을 ESC 로 닫는다', async () => {
    await page.keyboard.press('Escape');
    await 약관창.사라질때까지();
    await 두프레임기다리기(page);
    await verify('모달을 닫으면 모달을 연 「보기」 버튼으로 초점이 돌아간다', await 가입.약관보기('이용약관').evaluate((버튼) => 버튼 === document.activeElement), true);
  });
});
