import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 일회용회원으로로그인 } from './helpers/account.helper.js';
import { 로그인한아이디 } from './helpers/my-admin-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 문의화면 } from './pages/support-inquiry.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-548',
  name: '1:1 문의 내용 칸에 3자를 적으면 글자 수가 「3/1000」으로 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: z.object({
    내용: z.string().describe('내용 칸에 적는 글 — 3자').default('가나다'),
  }),
  expected: z.object({
    글자수: z.string().describe('내용 칸 아래 글자 수').default('3/1000'),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 화면 = new 문의화면(page);
  let 회원아이디 = '';

  await test.step('일회용 회원으로 로그인한다', async () => {
    await 안내창막기(page);
    회원아이디 = (await 일회용회원으로로그인(page)).loginId;
    await verify('일회용 회원으로 로그인해 있다', await 로그인한아이디(page.request), 회원아이디, { blocker: true });
  });

  await test.step('1:1 문의 화면을 연다', async () => {
    await 화면.열기();
    await verify('1:1 문의 화면이 보인다', await 화면.큰제목.isVisible(), true, { blocker: true });
  });

  await test.step('1:1 문의 내용 칸에 「가나다」를 적는다', async () => {
    await 화면.내용칸.fill(params.내용);
    await verify('1:1 문의 내용 칸에 3자를 적으면 글자 수가 「3/1000」으로 보인다', await 화면.글자수.innerText(), expected.글자수);
  });
});
