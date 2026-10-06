import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 임시회원가입, 임시회원정보, 임시회원지우기, 아이디사용중인가 } from './components/account.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-123',
  name: '없는 아이디로 로그인하면 「아이디 또는 비밀번호가 올바르지 않습니다」가 보인다',
  techniques: ['동등 분할'],
  precondition: ['비회원이다', '새로 만든 회원 계정이 있다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 화면 = new 로그인화면(page);
  const 회원 = 임시회원정보();
  const 없는아이디 = 임시회원정보().loginId;

  try {
    await test.step('요청으로 새 회원 계정을 만든다', async () => {
      await 임시회원가입(page.request, 회원);
    });

    await test.step('새로 만든 회원 계정이 있는지 확인한다', async () => {
      await verify('새로 만든 회원의 아이디는 이미 쓰고 있다', await 아이디사용중인가(page.request, 회원.loginId), true, { blocker: true });
    });

    await test.step('로그인 화면에서 없는 아이디와 아무 비밀번호로 「로그인」을 누른다', async () => {
      await 안내창끄기(page);
      await 화면.열기();
      await verify('로그인 화면 제목이 보인다', await 화면.제목.isVisible(), true, { blocker: true });
      await 화면.로그인하기(없는아이디, 'Abc!12345');
      await 화면.오류문구기다리기();
      await verify(
        '없는 아이디로 로그인하면 「아이디 또는 비밀번호가 올바르지 않습니다」가 보인다',
        await 화면.오류문구.filter({ hasText: '아이디 또는 비밀번호가 올바르지 않습니다' }).isVisible(),
        true,
      );
    });

    await test.step('새로 만든 회원 아이디와 틀린 비밀번호로 「로그인」을 누른다', async () => {
      await 화면.로그인하기(회원.loginId, 'Abc!12345');
      await 화면.오류문구기다리기();
      await verify(
        '아이디가 맞고 비밀번호만 틀려도 같은 「아이디 또는 비밀번호가 올바르지 않습니다」가 보인다',
        await 화면.오류문구.filter({ hasText: '아이디 또는 비밀번호가 올바르지 않습니다' }).isVisible(),
        true,
      );
    });
  } finally {
    await 임시회원지우기(page.request, 회원);
  }
});
