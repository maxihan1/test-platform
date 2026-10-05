import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창끄기 } from './components/session.component.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-083',
  name: '아이디 칸에 3자를 적으면 「아이디는 영문 소문자·숫자 4~12자입니다」가 보인다',
  techniques: ['경계값 분석'],
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 화면 = new 회원가입화면(page);

  await test.step('회원가입 화면 아이디 칸에 3자 「abc」를 적고 칸을 벗어난다', async () => {
    await 안내창끄기(page);
    await 화면.열기();
    await verify('회원가입 화면 제목이 보인다', await 화면.제목.isVisible(), true, { blocker: true });
    await 화면.아이디칸.fill('abc');
    await 화면.칸벗어나기(화면.아이디칸);
    await verify(
      '아이디 칸에 3자를 적으면 「아이디는 영문 소문자·숫자 4~12자입니다」가 보인다',
      await 화면.오류문구('loginId').filter({ hasText: '아이디는 영문 소문자·숫자 4~12자입니다' }).isVisible(),
      true,
    );
  });

  await test.step('아이디 칸에 4자 「abcd」를 적고 칸을 벗어난다', async () => {
    await 화면.아이디칸.fill('abcd');
    await 화면.칸벗어나기(화면.아이디칸);
    await verify('4자 아이디에는 아이디 오류 문구가 보이지 않는다', await 화면.오류문구('loginId').isVisible(), false);
  });

  await test.step('아이디 칸에 12자 「abcdefgh1234」를 적고 칸을 벗어난다', async () => {
    await 화면.아이디칸.fill('abcdefgh1234');
    await 화면.칸벗어나기(화면.아이디칸);
    await verify('12자 아이디에는 아이디 오류 문구가 보이지 않는다', await 화면.오류문구('loginId').isVisible(), false);
  });
});
