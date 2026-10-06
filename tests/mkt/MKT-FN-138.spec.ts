import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 임시회원가입, 임시회원정보, 임시회원지우기, 아이디사용중인가 } from './components/account.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 비밀번호찾기화면 } from './pages/find-password.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-138',
  name: '아이디와 이메일이 일치하지 않으면 「일치하는 회원 정보가 없습니다」가 보인다',
  techniques: ['동등 분할'],
  precondition: ['비회원이다', '새로 만든 회원 계정이 있다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 화면 = new 비밀번호찾기화면(page);
  const 회원 = 임시회원정보();

  try {
    await test.step('요청으로 새 회원 계정을 만든다', async () => {
      await 임시회원가입(page.request, 회원);
    });

    await test.step('새로 만든 회원 계정이 있는지 확인한다', async () => {
      await verify('새로 만든 회원의 아이디는 이미 쓰고 있다', await 아이디사용중인가(page.request, 회원.loginId), true, { blocker: true });
    });

    await test.step('비밀번호 찾기 화면에 그 회원의 아이디와 다른 이메일을 적고 「임시 비밀번호 받기」를 누른다', async () => {
      await 안내창끄기(page);
      await 화면.열기();
      await verify('비밀번호 찾기 화면 제목이 보인다', await 화면.제목.isVisible(), true, { blocker: true });
      await 화면.요청하기(회원.loginId, `other${회원.email}`);
      await verify(
        '아이디와 이메일이 일치하지 않으면 「일치하는 회원 정보가 없습니다」가 보인다',
        await 화면.결과문구.filter({ hasText: '일치하는 회원 정보가 없습니다' }).isVisible(),
        true,
      );
    });
  } finally {
    await 임시회원지우기(page.request, 회원);
  }
});
