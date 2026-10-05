import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창끄기 } from './components/session.component.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-089',
  name: '비밀번호에 7자를 적으면 「비밀번호는 영문·숫자·특수문자를 포함해 8~20자입니다」가 보인다',
  techniques: ['경계값 분석'],
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 화면 = new 회원가입화면(page);

  await test.step('회원가입 화면 비밀번호 칸에 7자 「Ab1!xyz」를 적고 칸을 벗어난다', async () => {
    await 안내창끄기(page);
    await 화면.열기();
    await verify('회원가입 화면 제목이 보인다', await 화면.제목.isVisible(), true, { blocker: true });
    await 화면.비밀번호칸.fill('Ab1!xyz');
    await 화면.칸벗어나기(화면.비밀번호칸);
    await verify(
      '비밀번호에 7자를 적으면 「비밀번호는 영문·숫자·특수문자를 포함해 8~20자입니다」가 보인다',
      await 화면.오류문구('password').filter({ hasText: '비밀번호는 영문·숫자·특수문자를 포함해 8~20자입니다' }).isVisible(),
      true,
    );
  });

  await test.step('비밀번호 칸에 8자 「Ab1!wxyz」를 적고 칸을 벗어난다', async () => {
    await 화면.비밀번호칸.fill('Ab1!wxyz');
    await 화면.칸벗어나기(화면.비밀번호칸);
    await verify('8자 비밀번호에는 비밀번호 오류 문구가 보이지 않는다', await 화면.오류문구('password').isVisible(), false);
  });

  await test.step('비밀번호 칸에 20자 「Ab1!Ab1!Ab1!Ab1!Ab1!」를 적고 칸을 벗어난다', async () => {
    await 화면.비밀번호칸.fill('Ab1!Ab1!Ab1!Ab1!Ab1!');
    await 화면.칸벗어나기(화면.비밀번호칸);
    await verify('20자 비밀번호에는 비밀번호 오류 문구가 보이지 않는다', await 화면.오류문구('password').isVisible(), false);
  });
});
