import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 로그인상태인가 } from './helpers/maintenance-dash.helper.js';
import { 대시보드화면 } from './pages/dashboard.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-752',
  name: '대시보드 숫자를 못 불러오면 본문에 서버 문구가 오류 글로 보이고 같은 글이 토스트로 뜬다',
  techniques: ['동등 분할'],
  precondition: ['대시보드 숫자 응답은 문구가 든 500 가짜 응답(모킹)이다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 대시보드 = new 대시보드화면(page);
  const 서버문구 = '운영 숫자를 불러오지 못했습니다';

  try {
    await test.step('운영자 계정으로 로그인하고 대시보드 숫자 응답을 가짜 응답으로 바꾼다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      await page.context().route('**/api/ops/summary', async (route) => {
        await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ code: 'INTERNAL', message: 서버문구 }) });
      });
      await verify('운영자 세션이 열려 있다', await 로그인상태인가(page), true, { blocker: true });
    });

    await test.step('대시보드를 연다', async () => {
      await 대시보드.숫자못불러온채열기();
      const 본문 = await verify('본문에 서버 문구가 오류 글로 보인다', (await 대시보드.틀.본문오류.innerText()).trim(), 서버문구);
      const 토스트 = await verify('같은 글이 토스트로 뜬다', await 대시보드.알림.뜰때까지(서버문구), true);
      await verify('대시보드 숫자를 못 불러오면 본문에 서버 문구가 오류 글로 보이고 같은 글이 토스트로 뜬다', 본문 && 토스트, true);
    });
  } finally {
    await page.context().unroute('**/api/ops/summary');
  }
});
