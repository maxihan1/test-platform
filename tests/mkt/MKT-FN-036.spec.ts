import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 둘째아이디, 방해막기, API로그인 } from './helpers/account.helper.js';
import { 틀린비밀번호, 아이디가있는가 } from './helpers/member.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-036',
  name: '틀린 비밀번호로 로그인하면 「아이디 또는 비밀번호가 올바르지 않습니다」 가 보인다',
  platforms: ['desktop'],
  precondition: [
    '두 번째 회원 계정을 쓴다',
    '비회원이다',
  ],
  techniques: ['동등 분할'],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 로그인 = new 로그인화면(page);
  const 머리 = new 머리글(page);

  try {
    await 방해막기(page);

    await test.step('두 번째 회원 아이디와 틀린 비밀번호로 「로그인」 을 누른다', async () => {
      await verify('두 번째 회원 아이디가 있다', await 아이디가있는가(request, 둘째아이디), true, { blocker: true });
      await 로그인.열기();
      await 로그인.입력하기(둘째아이디, 틀린비밀번호);
      await 로그인.응답받으며누르기();
      await 로그인.오류문구.filter({ hasText: /\S/ }).waitFor();
      await verify('틀린 비밀번호로 로그인하면 「아이디 또는 비밀번호가 올바르지 않습니다」 가 보인다', await 로그인.오류문구.innerText(), '아이디 또는 비밀번호가 올바르지 않습니다');
    });

    await test.step('없는 아이디로 「로그인」 을 누른다', async () => {
      await 로그인.열기();
      await 머리.로그인링크.waitFor();
      await verify('머리글에 「로그인」 링크가 보인다', await 머리.로그인링크.isVisible(), true, { blocker: true });
      await 로그인.입력하기('nouser0000', 틀린비밀번호);
      await 로그인.응답받으며누르기();
      await 로그인.오류문구.filter({ hasText: /\S/ }).waitFor();
      await verify('없는 아이디로 로그인해도 같은 「아이디 또는 비밀번호가 올바르지 않습니다」 가 보인다', await 로그인.오류문구.innerText(), '아이디 또는 비밀번호가 올바르지 않습니다');
    });
  } finally {
    await API로그인(request, 둘째아이디, params.password ?? '');
  }
});
