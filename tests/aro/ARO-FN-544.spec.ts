import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 제목으로공지찾기, 화면시각 } from './helpers/notice-log.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 공지치우기 } from './helpers/ops-api.helper.js';
import { 공지화면 } from './pages/notices.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-544',
  name: '시작을 비우고 새 공지를 저장하면 「기간」 시작이 저장한 시각이다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 공지화면(page);
  const 머리글 = '[QA] ARO-FN-544 ';
  const 제목 = `${머리글}${String(Date.now())}`;

  try {
    await test.step('운영자 계정으로 로그인하고 지난 실행의 [QA] 공지를 치운 뒤 「공지」 화면을 연다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      await 공지치우기(page, 머리글);
      await 화면.열기();
      await verify('「새 공지」 버튼이 보인다', await 화면.새공지버튼.isVisible(), true, { blocker: true });
    });

    await test.step('시작을 비우고 새 [QA] 공지를 저장한다', async () => {
      const 열렸다 = await 화면.새공지열기();
      await verify('「새 공지」 창이 열린다', 열렸다, true, { blocker: true });
      await 화면.적기({ 제목, 내용: `${머리글}내용`, 시작: '' });
      await 화면.저장누르기();
      const 줄이생겼다 = await 화면.줄(제목).waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('저장한 [QA] 공지 줄이 공지 표에 보인다', 줄이생겼다, true, { blocker: true });
      const 저장된 = await 제목으로공지찾기(page, 제목);
      const 기간 = (await 화면.칸(제목, '기간').innerText()).replace(/\s+/g, ' ').trim();
      await verify('시작을 비우고 새 공지를 저장하면 「기간」 시작이 저장한 시각이다', 기간.split(' ~')[0], 화면시각(저장된?.updatedAt ?? ''));
    });
  } finally {
    await 공지치우기(page, 머리글);
  }
});
