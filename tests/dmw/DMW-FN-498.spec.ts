import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-498',
  name: '이메일을 「abc」로 적으면 「이메일 형식이 올바르지 않습니다」가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  techniques: ['동등 분할'],
  params: z.object({
    badEmail: z.string().describe('가입할 이메일 — 이메일 형식이 아닌 값').default('abc'),
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

  await test.step('회원가입 이메일에 「abc」를 적는다', async () => {
    await 가입.이메일.fill(params.badEmail);
    await verify('이메일을 「abc」로 적으면 「이메일 형식이 올바르지 않습니다」가 보인다', await 가입.이메일오류.isVisible(), true);
  });

  await test.step('회원가입 이메일을 비우고 다음 칸으로 간다', async () => {
    await 가입.이메일.fill('');
    await 가입.이메일.press('Tab');
    await verify('이메일을 비우면 「이메일 형식이 올바르지 않습니다」가 보인다', await 가입.이메일오류.isVisible(), true);
  });
});
