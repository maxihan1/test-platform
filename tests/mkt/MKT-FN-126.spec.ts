import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인, 로그인요청, 임시회원가입, 임시회원정보, 임시회원지우기, 틀린로그인 } from './components/account.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-126',
  name: '잠긴 계정은 맞는 비밀번호로 로그인해도 「로그인 5회 실패로 10분간 로그인할 수 없습니다」가 보인다',
  techniques: ['동등 분할', '상태 전이'],
  precondition: ['비회원이다', '새로 만든 회원 계정이 비밀번호 5회 실패로 잠겨 있다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page, request }) => {
  const 화면 = new 로그인화면(page);
  const 회원 = 임시회원정보();

  try {
    await test.step('요청으로 새 회원 계정을 만들고 잠기기 전에 로그인해 둔 뒤 비밀번호를 다섯 번 틀린다', async () => {
      await 임시회원가입(request, 회원);
      await API로그인(request, 회원.loginId, 회원.password);
      await 틀린로그인(request, 회원.loginId, 5);
    });

    await test.step('새로 만든 회원 계정이 잠겨 있는지 확인한다', async () => {
      const 응답 = await 로그인요청(request, 회원.loginId, 회원.password);
      await verify('잠긴 계정은 맞는 비밀번호로 로그인 요청을 보내도 423 으로 응답한다', 응답.status(), 423, { blocker: true });
    });

    await test.step('잠긴 아이디와 맞는 비밀번호로 「로그인」을 누른다', async () => {
      await 안내창끄기(page);
      await 화면.열기();
      await verify('로그인 화면 제목이 보인다', await 화면.제목.isVisible(), true, { blocker: true });
      await 화면.로그인하기(회원.loginId, 회원.password);
      await 화면.오류문구기다리기();
      await verify(
        '잠긴 계정은 맞는 비밀번호로 로그인해도 「로그인 5회 실패로 10분간 로그인할 수 없습니다」가 보인다',
        await 화면.오류문구.filter({ hasText: '로그인 5회 실패로 10분간 로그인할 수 없습니다' }).isVisible(),
        true,
      );
      await verify('잠긴 계정은 로그인 화면에 머문다', new URL(page.url()).pathname, '/login');
    });
  } finally {
    await 임시회원지우기(request, 회원);
  }
});
