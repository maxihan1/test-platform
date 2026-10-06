import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인, 임시회원가입, 임시회원정보, 임시회원지우기, 아이디사용중인가 } from './components/account.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-125',
  name: '같은 아이디로 비밀번호를 네 번 틀리면 잠금 없이 「아이디 또는 비밀번호가 올바르지 않습니다」가 보인다',
  techniques: ['경계값 분석'],
  precondition: ['비회원이다', '새로 만든 회원 계정이 있다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page, request }) => {
  const 화면 = new 로그인화면(page);
  const 회원 = 임시회원정보();

  try {
    await test.step('요청으로 새 회원 계정을 만들고 잠기기 전에 로그인해 둔다', async () => {
      await 임시회원가입(request, 회원);
      await API로그인(request, 회원.loginId, 회원.password);
    });

    await test.step('새로 만든 회원 계정이 있는지 확인한다', async () => {
      await verify('새로 만든 회원의 아이디는 이미 쓰고 있다', await 아이디사용중인가(request, 회원.loginId), true, { blocker: true });
    });

    await test.step('새로 만든 회원 아이디로 틀린 비밀번호 로그인을 네 번 한다', async () => {
      await 안내창끄기(page);
      await 화면.열기();
      await verify('로그인 화면 제목이 보인다', await 화면.제목.isVisible(), true, { blocker: true });
      for (let i = 0; i < 4; i += 1) {
        await 화면.로그인하기(회원.loginId, 'Wrong!pw0');
        await 화면.오류문구기다리기();
      }
      await verify(
        '같은 아이디로 비밀번호를 네 번 틀리면 잠금 없이 「아이디 또는 비밀번호가 올바르지 않습니다」가 보인다',
        await 화면.오류문구.filter({ hasText: '아이디 또는 비밀번호가 올바르지 않습니다' }).isVisible(),
        true,
      );
    });

    await test.step('같은 아이디로 틀린 비밀번호 로그인을 한 번 더 한다', async () => {
      await 화면.로그인하기(회원.loginId, 'Wrong!pw0');
      await 화면.오류문구기다리기();
      await verify(
        '다섯 번째로 틀리면 「로그인 5회 실패로 10분간 로그인할 수 없습니다」가 보인다',
        await 화면.오류문구.filter({ hasText: '로그인 5회 실패로 10분간 로그인할 수 없습니다' }).isVisible(),
        true,
      );
    });
  } finally {
    await 임시회원지우기(request, 회원);
  }
});
