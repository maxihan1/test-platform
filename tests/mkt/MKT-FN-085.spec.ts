import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 임시회원정보 } from './components/account.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-085',
  name: '쓰지 않은 아이디로 「중복 확인」을 누르면 「사용 가능한 아이디입니다」가 보인다',
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 화면 = new 회원가입화면(page);
  const 새아이디 = 임시회원정보().loginId;

  await test.step('회원가입 화면 아이디 칸에 쓰지 않은 아이디를 적고 「중복 확인」을 누른다', async () => {
    await 안내창끄기(page);
    await 화면.열기();
    await verify('회원가입 화면 제목이 보인다', await 화면.제목.isVisible(), true, { blocker: true });
    await 화면.아이디칸.fill(새아이디);
    await 화면.중복확인하기();
    await verify(
      '쓰지 않은 아이디로 「중복 확인」을 누르면 「사용 가능한 아이디입니다」가 보인다',
      await 화면.오류문구('loginId').filter({ hasText: '사용 가능한 아이디입니다' }).isVisible(),
      true,
    );
  });
});
