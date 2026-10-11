import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 방해막기 } from './helpers/account.helper.js';
import { 비밀번호찾기화면 } from './pages/find-password.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-042',
  name: '아이디와 이메일이 일치하지 않으면 「일치하는 회원 정보가 없습니다」 가 보인다',
  platforms: ['desktop'],
  precondition: [
    '비회원이다',
  ],
  techniques: ['동등 분할'],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 찾기 = new 비밀번호찾기화면(page);
  const 머리 = new 머리글(page);

  await 방해막기(page);

  await test.step('아이디와 맞지 않는 이메일로 「임시 비밀번호 받기」 를 누른다', async () => {
    await 찾기.열기();
    await 머리.로그인링크.waitFor();
    await verify('머리글에 「로그인」 링크가 보인다', await 머리.로그인링크.isVisible(), true, { blocker: true });
    await 찾기.입력하기(params.loginId ?? '', 'nomatch@example.com');
    await 찾기.누르고결과기다리기();
    await verify('아이디와 이메일이 일치하지 않으면 「일치하는 회원 정보가 없습니다」 가 보인다', await 찾기.결과문구.innerText(), '일치하는 회원 정보가 없습니다');
  });
});
