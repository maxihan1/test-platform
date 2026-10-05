import { defineCase, test, verify } from '@platform/kit';

import { API로그인, 임시회원가입, 임시회원정보, 임시회원지우기 } from './components/account.component.js';
import { 머리글 } from './components/header.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 회원정보수정화면 } from './pages/my-profile.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-552',
  name: '재확인 비밀번호가 틀리면 「비밀번호가 올바르지 않습니다」가 보인다',
  precondition: ['새로 만든 회원으로 로그인해 있다'],
  unconfirmed: '기획서와 다름 — 차이 D31 · D32: 재확인 오류 문구와 회원정보 수정 휴대폰 칸의 숫자만 받는 규칙이 기획서에 없다 (작성 요청 5873)',
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 회원정보수정화면(page);
  const 헤더 = new 머리글(page);
  const 회원 = 임시회원정보();

  try {
    await test.step('로그인 요청으로 새 회원을 만들어 로그인한다', async () => {
      await 임시회원가입(page.request, 회원);
      await API로그인(page.request, 회원.loginId, 회원.password);
    });

    await test.step('새로 만든 회원으로 로그인해 있는지 확인한다', async () => {
      await 안내창끄기(page);
      await page.goto('/');
      await 헤더.로그아웃버튼.waitFor();
      await verify('로그인한 머리글에 인사말이 보인다', await 헤더.인사.isVisible(), true, { blocker: true });
    });

    await test.step('회원정보 수정 화면에서 틀린 비밀번호를 적고 「비밀번호 확인」을 누른다', async () => {
      await 화면.열기();
      await 화면.재확인누르기(`${회원.password}x`);
      await 화면.재확인오류.filter({ hasText: /\S/ }).waitFor();
      await verify('재확인 비밀번호가 틀리면 「비밀번호가 올바르지 않습니다」가 보인다', (await 화면.재확인오류.innerText()).trim(), '비밀번호가 올바르지 않습니다');
    });

    await test.step('맞는 비밀번호로 재확인한 뒤 휴대폰 칸에 「01a-2b3」을 적는다', async () => {
      await 화면.재확인하기(회원.password);
      await 화면.휴대폰칸.fill('');
      await 화면.휴대폰칸.pressSequentially('01a-2b3');
      await verify('회원정보 수정 휴대폰 칸에는 숫자 「0123」만 남는다', await 화면.휴대폰칸.inputValue(), '0123');
    });
  } finally {
    await 임시회원지우기(page.request, 회원);
  }
});
