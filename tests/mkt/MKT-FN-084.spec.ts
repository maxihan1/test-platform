import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 빨간색인가 } from './components/member-helpers.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-084',
  name: '대문자 아이디를 적으면 입력칸 아래에 「아이디는 영문 소문자·숫자 4~12자입니다」가 빨간 글자로 보인다',
  techniques: ['동등 분할'],
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 화면 = new 회원가입화면(page);

  await test.step('회원가입 화면 아이디 칸에 대문자 「ABCD」를 적고 칸을 벗어난다', async () => {
    await 안내창끄기(page);
    await 화면.열기();
    await verify('회원가입 화면 제목이 보인다', await 화면.제목.isVisible(), true, { blocker: true });
    await 화면.아이디칸.fill('ABCD');
    await 화면.칸벗어나기(화면.아이디칸);
    const 문구보임 = await 화면.오류문구('loginId').filter({ hasText: '아이디는 영문 소문자·숫자 4~12자입니다' }).isVisible();
    await verify(
      '대문자 아이디를 적으면 입력칸 아래에 「아이디는 영문 소문자·숫자 4~12자입니다」가 빨간 글자로 보인다',
      문구보임 && (await 화면.칸아래에있나('loginId', 화면.아이디칸)) && 빨간색인가(await 화면.오류문구글자색('loginId')),
      true,
    );
  });

  await test.step('아이디 칸에 특수문자가 든 「ab_cd」를 적고 칸을 벗어난다', async () => {
    await 화면.아이디칸.fill('ab_cd');
    await 화면.칸벗어나기(화면.아이디칸);
    await verify(
      '특수문자가 든 아이디에도 「아이디는 영문 소문자·숫자 4~12자입니다」가 보인다',
      await 화면.오류문구('loginId').filter({ hasText: '아이디는 영문 소문자·숫자 4~12자입니다' }).isVisible(),
      true,
    );
  });
});
