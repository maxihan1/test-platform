import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 공지치우기, 새공지 } from './helpers/ops-api.helper.js';
import { 공지화면 } from './pages/notices.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-514',
  name: '꺼진 공지의 「켜기」를 켜면 토스트 「공지를 켰습니다」가 뜬다',
  precondition: ['꺼진 [QA] 공지가 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 공지화면(page);
  const 머리글 = '[QA] ARO-FN-514 ';
  const 제목 = `${머리글}${String(Date.now())}`;

  try {
    await test.step('운영자 계정으로 로그인하고 지난 실행의 [QA] 공지를 치운다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      await 공지치우기(page, 머리글);
    });

    await test.step('API 로 꺼진 [QA] 공지를 만들고 「공지」를 연다', async () => {
      await 새공지(page, { title: 제목, body: `${머리글}내용`, startsAt: null, endsAt: null, enabled: false });
      await 화면.열기();
      await verify('꺼진 [QA] 공지가 있다', await 화면.켜기스위치(제목).isChecked(), false, { blocker: true });
    });

    await test.step('그 공지의 「켜기」를 켠다', async () => {
      await 화면.켜기스위치(제목).click();
      const 떴다 = await 화면.알림.뜰때까지('공지를 켰습니다');
      await verify('꺼진 공지의 「켜기」를 켜면 토스트 「공지를 켰습니다」가 뜬다', 떴다, true);
    });
  } finally {
    await 공지치우기(page, 머리글);
  }
});
