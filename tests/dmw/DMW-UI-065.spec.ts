import { defineCase, test, verify } from '@platform/kit';

import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-065',
  name: '약관 「보기」를 누르면 약관 전문 모달이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 가입 = new 회원가입화면(page);
  const 약관창 = 가입.약관창('이용약관');
  await 안내창막기(page);

  await test.step('회원가입 화면을 연다', async () => {
    await 가입.열기();
    await verify('비회원이다', await 가입.머리.로그인.isVisible(), true, { blocker: true });
    await verify('회원가입 화면이 보인다', await 가입.큰제목.isVisible(), true, { blocker: true });
  });

  await test.step('「(필수) 이용약관 동의」 옆 「보기」를 누른다', async () => {
    await 가입.약관보기('이용약관').click();
    await 약관창.뜰때까지();
    await verify('약관 「보기」를 누르면 약관 전문 모달이 보인다', await 약관창.창.isVisible(), true);
  });
});
