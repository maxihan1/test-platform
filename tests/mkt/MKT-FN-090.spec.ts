import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창끄기 } from './components/session.component.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-090',
  name: '영문만 적은 비밀번호에는 「비밀번호는 영문·숫자·특수문자를 포함해 8~20자입니다」가 보인다',
  techniques: ['동등 분할'],
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 화면 = new 회원가입화면(page);

  await test.step('회원가입 화면 비밀번호 칸에 영문만 「abcdefgh」를 적고 칸을 벗어난다', async () => {
    await 안내창끄기(page);
    await 화면.열기();
    await verify('회원가입 화면 제목이 보인다', await 화면.제목.isVisible(), true, { blocker: true });
    await 화면.비밀번호칸.fill('abcdefgh');
    await 화면.칸벗어나기(화면.비밀번호칸);
    await verify(
      '영문만 적은 비밀번호에는 「비밀번호는 영문·숫자·특수문자를 포함해 8~20자입니다」가 보인다',
      await 화면.오류문구('password').filter({ hasText: '비밀번호는 영문·숫자·특수문자를 포함해 8~20자입니다' }).isVisible(),
      true,
    );
  });

  await test.step('비밀번호 칸에 특수문자 없이 「abcd1234」를 적고 칸을 벗어난다', async () => {
    await 화면.비밀번호칸.fill('abcd1234');
    await 화면.칸벗어나기(화면.비밀번호칸);
    await verify(
      '특수문자가 없는 비밀번호에도 비밀번호 규칙 문구가 보인다',
      await 화면.오류문구('password').filter({ hasText: '비밀번호는 영문·숫자·특수문자를 포함해 8~20자입니다' }).isVisible(),
      true,
    );
  });

  await test.step('비밀번호 칸에 숫자 없이 「abcdefg!」를 적고 칸을 벗어난다', async () => {
    await 화면.비밀번호칸.fill('abcdefg!');
    await 화면.칸벗어나기(화면.비밀번호칸);
    await verify(
      '숫자가 없는 비밀번호에도 비밀번호 규칙 문구가 보인다',
      await 화면.오류문구('password').filter({ hasText: '비밀번호는 영문·숫자·특수문자를 포함해 8~20자입니다' }).isVisible(),
      true,
    );
  });
});
