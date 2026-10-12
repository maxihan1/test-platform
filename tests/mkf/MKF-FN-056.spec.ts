import { defineCase, test, verify } from '@platform/kit';

import { 토스트 } from './components/toast.component.js';
import { 세션아이디, 경로 } from './helpers/common-tools.helper.js';
import { 나타났나 } from './helpers/member-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-056',
  name: '관심 분야 셋을 켜면 셋 다 켜져 있다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
  techniques: ['경계값 분석'],
});

test(spec, async ({ page }) => {
  const 회원가입 = new 회원가입화면(page);
  const 알림 = new 토스트(page);

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

  await test.step('관심 분야 셋을 켠다', async () => {
    await 회원가입.관심패션.check();
    await 회원가입.관심전자기기.check();
    await 회원가입.관심도서.check();
    await verify(
      '관심 분야 셋을 켜면 셋 다 켜져 있다',
      { 패션: await 회원가입.관심패션.isChecked(), 전자기기: await 회원가입.관심전자기기.isChecked(), 도서: await 회원가입.관심도서.isChecked() },
      { 패션: true, 전자기기: true, 도서: true },
    );
  });

  await test.step('관심 분야 셋을 켠 뒤 넷째를 누른다', async () => {
    await 회원가입.관심식품.click();
    await verify('관심 분야 넷째를 누르면 넷째는 켜지지 않는다', await 회원가입.관심식품.isChecked(), false);
  });

  await test.step('관심 분야 셋을 켠 뒤 넷째를 누르고 토스트를 기다린다', async () => {
    await 회원가입.관심식품.click();
    await verify(
      '관심 분야 넷째를 누르면 토스트 「관심 분야는 최대 3개까지 선택할 수 있습니다」가 보인다',
      await 나타났나(알림.글('관심 분야는 최대 3개까지 선택할 수 있습니다')),
      true,
    );
  });
});
