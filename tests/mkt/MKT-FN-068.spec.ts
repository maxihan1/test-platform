import { defineCase, test, verify } from '@platform/kit';

import { 모달 } from './components/modal.component.js';
import { 세션아이디, 경로 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-068',
  name: '약관 모달의 오른쪽 위 X 를 누르면 모달이 보이지 않는다',
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
  });

  await test.step('회원가입 화면이 열렸는지 확인한다', async () => {
    await 회원가입.제목.waitFor();
    await verify('회원가입 화면이 열려 있다', 경로(page), 회원가입화면.주소, { blocker: true });
  });

  await test.step('약관 모달을 열고 오른쪽 위 X 를 누른다', async () => {
    await 회원가입.이용약관보기.click();
    await 약관창.창.waitFor();
    await 약관창.닫기X.click();
    await 약관창.배경.waitFor({ state: 'detached' });
    await verify('약관 모달의 오른쪽 위 X 를 누르면 모달이 보이지 않는다', await 약관창.창.isVisible(), false);
  });

  await test.step('약관 모달을 열고 모달 바깥을 누른다', async () => {
    await 회원가입.이용약관보기.click();
    await 약관창.창.waitFor();
    await 약관창.배경.click({ position: { x: 5, y: 5 } });
    await 약관창.배경.waitFor({ state: 'detached' });
    await verify('약관 모달 바깥을 누르면 모달이 보이지 않는다', await 약관창.창.isVisible(), false);
  });

  await test.step('약관 모달을 열고 ESC 를 친다', async () => {
    await 회원가입.이용약관보기.click();
    await 약관창.창.waitFor();
    await page.keyboard.press('Escape');
    await 약관창.배경.waitFor({ state: 'detached' });
    await verify('약관 모달에서 ESC 를 치면 모달이 보이지 않는다', await 약관창.창.isVisible(), false);
  });
});
