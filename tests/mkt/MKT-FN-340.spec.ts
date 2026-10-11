import { defineCase, test, verify } from '@platform/kit';

import { 모달 } from './components/modal.component.js';
import { 초점있나, 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-340',
  name: '약관 모달을 닫으면 모달을 연 「보기」 버튼으로 초점이 돌아간다',
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

  await test.step('회원가입을 연다', async () => {
    await 방해막기(page);
    await 회원가입.열기();
    await 회원가입.제목.waitFor();
  });

  await test.step('회원가입에서 「보기」로 약관 모달을 열고 ESC 로 닫는다', async () => {
    await 회원가입.이용약관보기.click();
    await 약관창.창.waitFor();
    await page.keyboard.press('Escape');
    await 약관창.배경.waitFor({ state: 'detached' });
    await verify('약관 모달을 닫으면 모달을 연 「보기」 버튼으로 초점이 돌아간다', await 초점있나(회원가입.이용약관보기), true);
  });
});
