import { defineCase, test, verify } from '@platform/kit';

import { 모달 } from './components/modal.component.js';
import { 보이는글, 세션아이디, 경로 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-058',
  name: '약관 「보기」를 누르면 약관 전문 모달이 뜬다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 회원가입 = new 회원가입화면(page);
  const 약관창 = new 모달(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('회원가입 화면을 연다', async () => {
    await 방해막기(page);
    await 회원가입.열기();
  });

  await test.step('회원가입 화면이 열렸는지 확인한다', async () => {
    await 회원가입.제목.waitFor();
    await verify('회원가입 화면이 열려 있다', 경로(page), 회원가입화면.주소, { blocker: true });
  });

  await test.step('「(필수) 이용약관 동의」 옆 「보기」를 누른다', async () => {
    await 회원가입.이용약관보기.click();
    await 약관창.창.waitFor();
    await verify('약관 「보기」를 누르면 약관 전문 모달이 뜬다', { 모달: await 약관창.창.isVisible(), 약관글: (await 보이는글(약관창.본문)) !== '' }, { 모달: true, 약관글: true });
  });
});
