import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 지금에서, 하루, 한시간 } from './helpers/notice-log.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 공지치우기, 새공지 } from './helpers/ops-api.helper.js';
import { 공지화면 } from './pages/notices.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-508',
  name: '끝 시각이 지난 켜진 공지를 만들면 「상태」가 「끝남」이다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 공지화면(page);
  const 머리글 = '[QA] ARO-FN-508 ';
  const 제목 = `${머리글}${String(Date.now())}`;

  try {
    await test.step('운영자 계정으로 로그인하고 지난 실행의 [QA] 공지를 치운다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      await 공지치우기(page, 머리글);
    });

    await test.step('API 로 시작이 어제 · 끝이 1시간 전인 켜진 [QA] 공지를 만들고 「공지」를 연다', async () => {
      await 새공지(page, { title: 제목, body: `${머리글}내용`, startsAt: 지금에서(-하루), endsAt: 지금에서(-한시간), enabled: true });
      await 화면.열기();
      await verify('끝이 지난 [QA] 공지 줄이 공지 표에 보인다', await 화면.줄(제목).isVisible(), true, { blocker: true });
      await verify('끝 시각이 지난 켜진 공지를 만들면 「상태」가 「끝남」이다', (await 화면.칸(제목, '상태').innerText()).trim(), '끝남');
    });
  } finally {
    await 공지치우기(page, 머리글);
  }
});
