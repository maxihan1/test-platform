import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 임시회원가입, 임시회원정보, 임시회원지우기, 아이디사용중인가 } from './components/account.component.js';
import { 모달 } from './components/feedback.component.js';
import { 머리글 } from './components/header.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-124',
  name: '네 번 틀린 뒤 맞는 비밀번호로 로그인하면 머리글에 「로그아웃」이 보인다',
  precondition: ['비회원이다', '새로 만든 회원 계정이 있다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 화면 = new 로그인화면(page);
  const 헤더 = new 머리글(page);
  const 창 = new 모달(page);
  const 회원 = 임시회원정보();

  try {
    await test.step('요청으로 새 회원 계정을 만든다', async () => {
      await 임시회원가입(page.request, 회원);
    });

    await test.step('새로 만든 회원 계정이 있는지 확인한다', async () => {
      await verify('새로 만든 회원의 아이디는 이미 쓰고 있다', await 아이디사용중인가(page.request, 회원.loginId), true, { blocker: true });
    });

    await test.step('틀린 비밀번호로 네 번 로그인한 뒤 맞는 비밀번호로 로그인한다', async () => {
      await 안내창끄기(page);
      await 화면.열기();
      await verify('로그인 화면 제목이 보인다', await 화면.제목.isVisible(), true, { blocker: true });
      for (let i = 0; i < 4; i += 1) {
        await 화면.로그인하기(회원.loginId, 'Wrong!pw0');
        await 화면.오류문구기다리기();
      }
      await 화면.로그인하기(회원.loginId, 회원.password);
      await 헤더.인사.waitFor();
      await verify('네 번 틀린 뒤 맞는 비밀번호로 로그인하면 머리글에 「로그아웃」이 보인다', await 헤더.로그아웃버튼.isVisible(), true);
    });

    await test.step('로그아웃하고 틀린 비밀번호로 한 번 더 로그인한다', async () => {
      await 헤더.로그아웃버튼.click();
      await 창.열림기다리기();
      await 창.버튼('확인').click();
      await 헤더.로그인링크.waitFor();
      await 화면.열기();
      await 화면.로그인하기(회원.loginId, 'Wrong!pw0');
      await 화면.오류문구기다리기();
      await verify(
        '로그인에 성공한 뒤 다시 틀리면 잠금 문구 대신 「아이디 또는 비밀번호가 올바르지 않습니다」가 보인다',
        await 화면.오류문구.filter({ hasText: '아이디 또는 비밀번호가 올바르지 않습니다' }).isVisible(),
        true,
      );
    });
  } finally {
    await 임시회원지우기(page.request, 회원);
  }
});
