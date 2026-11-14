import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 글자 } from './helpers/ops-api.helper.js';
import { 공지화면 } from './pages/notices.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-539',
  name: '공지 제목 칸에 60자를 적으면 60자가 다 들어간다',
  techniques: ['경계값 분석'],
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 공지화면(page);

  await test.step('운영자 계정으로 로그인하고 「공지」 화면에서 「새 공지」 창을 연다', async () => {
    await 운영자쿠키받기(page, params.loginId, params.loginPassword);
    await 화면.열기();
    const 열렸다 = await 화면.새공지열기();
    await verify('「새 공지」 창이 열린다', 열렸다, true, { blocker: true });
  });

  await test.step('공지 제목 칸에 60자를 적는다', async () => {
    await 화면.적기({ 제목: 글자(60) });
    await verify('공지 제목 칸에 60자를 적으면 60자가 다 들어간다', (await 화면.제목칸.inputValue()).length, 60);
  });

  await test.step('공지 제목 칸에 61자를 적는다', async () => {
    await 화면.적기({ 제목: 글자(61) });
    await verify('공지 제목 칸에 61자를 적어도 60자까지만 들어간다', (await 화면.제목칸.inputValue()).length, 60);
  });

  await test.step('공지 내용 칸에 1,000자를 적는다', async () => {
    await 화면.적기({ 내용: 글자(1000) });
    await verify('공지 내용 칸 1,000자는 다 들어간다', (await 화면.내용칸.inputValue()).length, 1000);
  });

  await test.step('공지 내용 칸에 1,001자를 적는다', async () => {
    await 화면.적기({ 내용: 글자(1001) });
    await verify('공지 내용 칸에 1,001자를 적어도 1,000자까지만 들어간다', (await 화면.내용칸.inputValue()).length, 1000);
  });
});
