import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 로그인상태인가, 숫자글 } from './helpers/maintenance-dash.helper.js';
import { 새공지, 공지치우기, 서버상태 } from './helpers/ops-api.helper.js';
import { 대시보드화면 } from './pages/dashboard.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-157',
  name: '켜진 공지를 만든 뒤 대시보드를 열면 「게임에 보이는 공지」 카드가 게임에 보이는 공지 수와 같다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
    API서버: z.string().url().describe('게임 API 서버 주소 — 운영툴과 같은 서버를 쓰는 API 서버').default('https://bossroom-api.maxihan.com'),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 대시보드 = new 대시보드화면(page);
  const 머리글 = '[QA] ARO-FN-157';

  try {
    await test.step('운영자 계정으로 로그인하고 지난 실행이 남긴 공지를 치운다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      await 공지치우기(page, 머리글);
      await verify('운영자 세션이 열려 있다', await 로그인상태인가(page), true, { blocker: true });
    });

    await test.step('API 로 켜진 [QA] 공지를 만든 뒤 대시보드를 연다', async () => {
      await 새공지(page, { title: 머리글 + ' ' + String(Date.now()), body: '시험 공지', startsAt: null, endsAt: null, enabled: true });
      await 대시보드.열기();
      const 카드 = (await 대시보드.카드값('게임에 보이는 공지').innerText()).trim();
      const 상태 = await 서버상태(request, params.API서버);
      await verify('켜진 공지를 만든 뒤 대시보드를 열면 「게임에 보이는 공지」 카드가 게임에 보이는 공지 수와 같다', 카드, 숫자글(상태.notices.length));
    });
  } finally {
    await 공지치우기(page, 머리글);
  }
});
