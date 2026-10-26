import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-055',
  name: '눈 모양 버튼을 누르면 적은 비밀번호가 글자로 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: z.object({
    passBase: z.string().describe('가입할 비밀번호 — 눈 모양 버튼으로 보고 가릴 값').default('abcd1234!'),
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

  await test.step('비밀번호를 적고 눈 모양 버튼을 누른다', async () => {
    await 가입.비밀번호.fill(params.passBase);
    await 가입.눈.click();
    await verify('눈 모양 버튼을 누르면 적은 비밀번호가 글자로 보인다', await 가입.칸종류(가입.비밀번호), 'text');
  });

  await test.step('눈 모양 버튼을 다시 누른다', async () => {
    await 가입.눈.click();
    await verify('눈 모양 버튼을 다시 누르면 비밀번호가 가려진다', await 가입.칸종류(가입.비밀번호), 'password');
  });
});
