import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 모달 } from './components/modal.component.js';
import { 쿠키띠 } from './components/cookie-bar.component.js';
import { 회원가입화면 } from './pages/signup.page.js';
import { 약관모달보조 } from './pages/signup-terms.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-032',
  name: '약관 모달이 열려 있는 동안 뒤 화면은 스크롤되지 않고 모달을 닫으면 「보기」 버튼으로 초점이 돌아간다',
  precondition: ['비회원이다', '약관 모달이 열려 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 가입 = new 회원가입화면(page);
  const 보조 = new 약관모달보조(page);
  const 모달창 = new 모달(page);
  const 쿠키 = new 쿠키띠(page);
  const 머리 = new 머리글(page);

  await test.step('약관 「보기」로 모달을 연다', async () => {
    await 가입.열기();
    await 가입.가입하기버튼().waitFor();
    await 머리.로그인링크().waitFor();
    await 쿠키.동의하기();
    await verify('비회원이다', await 머리.로그인링크().isVisible(), true, { blocker: true });
    await 가입.약관보기버튼('(필수) 이용약관 동의').click();
    await 모달창.창().waitFor();
    await verify('모달이 열려 있는 동안 뒤 화면은 스크롤되지 않는다', await 보조.본문스크롤상태(), 'hidden');
  });

  await test.step('모달을 닫는다', async () => {
    await verify('약관 모달이 열려 있다', await 모달창.창().isVisible(), true, { blocker: true });
    await 모달창.닫기X().click();
    await 모달창.창().waitFor({ state: 'detached' });
    await verify('모달이 닫히면 모달을 연 버튼으로 초점이 돌아간다', await 보조.초점이있는가(가입.약관보기버튼('(필수) 이용약관 동의')), true);
  });
});
