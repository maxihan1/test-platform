import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 공지치우기, 새공지 } from './helpers/ops-api.helper.js';
import { 공지화면 } from './pages/notices.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-520',
  name: '공지 두 개를 만들면 번호가 큰 공지가 위에 보인다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 공지화면(page);
  const 머리글 = '[QA] ARO-FN-520 ';
  const 먼저제목 = `${머리글}${String(Date.now())} 먼저`;
  const 나중제목 = `${머리글}${String(Date.now())} 나중`;

  try {
    await test.step('운영자 계정으로 로그인하고 지난 실행의 [QA] 공지를 치운다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      await 공지치우기(page, 머리글);
    });

    await test.step('API 로 [QA] 공지 두 개를 차례로 만들고 「공지」를 연다', async () => {
      const 먼저번호 = await 새공지(page, { title: 먼저제목, body: `${머리글}내용`, startsAt: null, endsAt: null, enabled: true });
      const 나중번호 = await 새공지(page, { title: 나중제목, body: `${머리글}내용`, startsAt: null, endsAt: null, enabled: true });
      await verify('나중에 만든 공지의 번호가 더 크다', 나중번호 > 먼저번호, true, { blocker: true });
      await 화면.열기();
      await verify('만든 [QA] 공지 두 개가 공지 표에 보인다', (await 화면.줄(먼저제목).count()) + (await 화면.줄(나중제목).count()), 2, { blocker: true });
      const 제목들 = (await 화면.제목들.allInnerTexts()).map((글) => 글.trim());
      await verify('공지 두 개를 만들면 번호가 큰 공지가 위에 보인다', 제목들.indexOf(나중제목) >= 0 && 제목들.indexOf(나중제목) < 제목들.indexOf(먼저제목), true);
    });
  } finally {
    await 공지치우기(page, 머리글);
  }
});
