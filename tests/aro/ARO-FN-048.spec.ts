import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 내용으로공지치우기 } from './helpers/notice-log.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 공지치우기 } from './helpers/ops-api.helper.js';
import { 공지화면 } from './pages/notices.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-048',
  name: '제목 없이 공지를 저장하면 서버가 준 「공지 제목을 1~60자로 입력하세요」가 토스트로 보인다',
  techniques: ['동등 분할'],
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 공지화면(page);
  const 머리글 = '[QA] ARO-FN-048 ';

  try {
    await test.step('운영자 계정으로 로그인하고 「공지」 화면을 연다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      await 공지치우기(page, 머리글);
      await 내용으로공지치우기(page, 머리글);
      await 화면.열기();
      await verify('「새 공지」 버튼이 보인다', await 화면.새공지버튼.isVisible(), true, { blocker: true });
    });

    await test.step('「새 공지」 창에 제목을 비우고 내용만 적어 「저장」을 누른다', async () => {
      const 열렸다 = await 화면.새공지열기();
      await verify('「새 공지」 창이 열린다', 열렸다, true, { blocker: true });
      await 화면.적기({ 제목: '', 내용: `${머리글}내용` });
      await 화면.저장누르기();
      const 떴다 = await 화면.알림.뜰때까지('공지 제목을 1~60자로 입력하세요');
      await verify('제목 없이 공지를 저장하면 서버가 준 「공지 제목을 1~60자로 입력하세요」가 토스트로 보인다', 떴다, true);
    });
  } finally {
    await 공지치우기(page, 머리글);
    await 내용으로공지치우기(page, 머리글);
  }
});
