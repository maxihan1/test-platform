import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 글자, 공지저장, 공지치우기 } from './helpers/ops-api.helper.js';
import { 기록화면 } from './pages/logs.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-694',
  name: '공지 저장이 검사에서 거절되면 「기록」에 줄을 남기지 않는다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 기록화면(page);
  const 머리글 = '[QA] ARO-FN-694 ';
  const 제목 = `${머리글}${글자(61 - 머리글.length, '나')}`;

  try {
    await test.step('운영자 계정으로 로그인하고 지난 실행의 [QA] 공지를 치운다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      await 공지치우기(page, 머리글);
    });

    await test.step('API 로 제목 61자인 [QA] 공지를 보내 거절된 뒤 「기록」에서 그 제목으로 찾는다', async () => {
      const 응답 = await 공지저장(page, { title: 제목, body: `${머리글}내용`, startsAt: null, endsAt: null, enabled: true });
      await verify('제목 61자 공지 저장이 거절된다', 응답.status, 400, { blocker: true });
      await 화면.열기();
      await verify('「기록」 표에 줄이 보인다', (await 화면.줄들.count()) > 0, true, { blocker: true });
      await 화면.검색(제목);
      await verify('공지 저장이 검사에서 거절되면 「기록」에 줄을 남기지 않는다', await 화면.줄들.count(), 0);
    });
  } finally {
    await 공지치우기(page, 머리글);
  }
});
