import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 일회용회원으로로그인 } from './helpers/account.helper.js';
import { 글자 } from './helpers/common-tools.helper.js';
import { 로그인한아이디 } from './helpers/my-admin-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 문의화면 } from './pages/support-inquiry.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-537',
  name: '1:1 문의 내용 칸에 1000자를 적으면 1000자가 다 들어간다',
  platforms: ['desktop', 'mobile'],
  techniques: ['경계값 분석'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: z.object({
    내용한도안글자수: z.number().int().min(1).describe('내용 칸에 적는 글자 수 — 1~1000').default(1000),
    내용한도밖글자수: z.number().int().min(1001).describe('한도를 넘겨 적는 글자 수 — 1001 이상').default(1001),
  }),
  expected: z.object({
    최대글자수: z.number().describe('내용 칸에 들어가는 최대 글자 수').default(1000),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 화면 = new 문의화면(page);
  let 회원아이디 = '';

  await test.step('일회용 회원으로 로그인한다', async () => {
    await 안내창막기(page);
    회원아이디 = (await 일회용회원으로로그인(page)).loginId;
  });

  await test.step('로그인 상태를 확인한다', async () => {
    await verify('일회용 회원으로 로그인해 있다', await 로그인한아이디(page.request), 회원아이디, { blocker: true });
  });

  await test.step('1:1 문의 화면을 연다', async () => {
    await 화면.열기();
    await verify('1:1 문의 화면이 보인다', await 화면.큰제목.isVisible(), true, { blocker: true });
  });

  await test.step('1:1 문의 내용 칸에 1000자를 적는다', async () => {
    await 화면.내용칸.fill(글자(params.내용한도안글자수));
    await verify('1:1 문의 내용 칸에 1000자를 적으면 1000자가 다 들어간다', (await 화면.내용칸.inputValue()).length, params.내용한도안글자수);
  });

  await test.step('1:1 문의 내용 칸에 1001자를 적는다', async () => {
    await 화면.내용칸.fill(글자(params.내용한도밖글자수));
    await verify('1:1 문의 내용 칸에 1001자를 적으면 1000자까지만 들어간다', (await 화면.내용칸.inputValue()).length, expected.최대글자수);
  });
});
