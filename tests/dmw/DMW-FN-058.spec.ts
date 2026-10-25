import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-058',
  name: '이미 있는 아이디로 「중복 확인」을 누르면 「이미 사용 중인 아이디입니다」가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  techniques: ['동등 분할'],
  params: z.object({
    takenId: z.string().describe('확인할 아이디 — 이미 가입된 영문 소문자·숫자 4~12자').default('admin'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 가입 = new 회원가입화면(page);
  await 안내창막기(page);

  await test.step('회원가입 화면을 연다', async () => {
    await 가입.열기();
    await verify('비회원이다', await 가입.머리.로그인.isVisible(), true, { blocker: true });
    await verify('회원가입 화면이 보인다', await 가입.큰제목.isVisible(), true, { blocker: true });
  });

  await test.step('이미 있는 아이디 「admin」으로 「중복 확인」을 누른다', async () => {
    await 가입.아이디.fill(params.takenId);
    await 가입.중복확인하기();
    await verify('이미 있는 아이디로 「중복 확인」을 누르면 「이미 사용 중인 아이디입니다」가 보인다', await 가입.사용중.isVisible(), true);
  });
});
