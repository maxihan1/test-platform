import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 요청세기 } from './helpers/notice-log.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 공지치우기 } from './helpers/ops-api.helper.js';
import { 공지화면 } from './pages/notices.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-764',
  name: '「새 공지」 창의 「저장」을 빠르게 두 번 누르면 공지 표에 그 공지가 하나만 생긴다',
  techniques: ['오류 추정'],
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 공지화면(page);
  const 머리글 = '[QA] ARO-FN-764 ';
  const 제목 = `${머리글}${String(Date.now())}`;

  try {
    await test.step('운영자 계정으로 로그인하고 지난 실행의 [QA] 공지를 치운 뒤 「공지」 화면을 연다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      await 공지치우기(page, 머리글);
      await 화면.열기();
      await verify('「새 공지」 버튼이 보인다', await 화면.새공지버튼.isVisible(), true, { blocker: true });
    });

    await test.step('「새 공지」 창의 「저장」을 빠르게 두 번 누른다', async () => {
      const 열렸다 = await 화면.새공지열기();
      await verify('「새 공지」 창이 열린다', 열렸다, true, { blocker: true });
      await 화면.적기({ 제목, 내용: `${머리글}내용` });
      const 저장요청 = 요청세기(page, (요청) => 요청.method() === 'POST' && new URL(요청.url()).pathname === '/api/ops/notices');
      await 화면.저장두번누르기();
      await 저장요청.끝날때까지();
      await 화면.줄(제목).first().waitFor({ timeout: 10_000 }).catch(() => undefined);
      await 화면.화면이다시그려질때까지();
      await verify('「새 공지」 창의 「저장」을 빠르게 두 번 누르면 공지 표에 그 공지가 하나만 생긴다', await 화면.줄(제목).count(), 1);
    });
  } finally {
    await 공지치우기(page, 머리글);
  }
});
