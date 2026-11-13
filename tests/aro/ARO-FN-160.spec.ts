import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 로그인상태인가, 숫자글, 오늘지급수, 지난지급치우기 } from './helpers/maintenance-dash.helper.js';
import { 캐릭터번호, 새지급, 지급치우기 } from './helpers/ops-api.helper.js';
import { 대시보드화면 } from './pages/dashboard.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-160',
  name: '지급을 보낸 뒤 대시보드를 열면 「오늘 지급」 카드가 UTC 0시 뒤에 보낸 지급 수와 같다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 대시보드 = new 대시보드화면(page);
  const 머리글 = '[QA] ARO-FN-160';
  let 지급번호 = 0;

  try {
    await test.step('운영자 계정으로 로그인하고 지난 실행이 남긴 지급을 회수한다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      await 지난지급치우기(page, 머리글);
      await verify('운영자 세션이 열려 있다', await 로그인상태인가(page), true, { blocker: true });
    });

    await test.step('API 로 qa_player2 에게 지급한 뒤 대시보드를 연다', async () => {
      const 캐릭터 = await 캐릭터번호(page, 'qa_player2');
      지급번호 = await 새지급(page, { characterIds: [캐릭터], subject: 머리글 + ' ' + String(Date.now()), body: '시험 지급', items: [], currencyAmount: 1, reason: 머리글 + ' 사유' });
      await 대시보드.열기();
      const 카드 = (await 대시보드.카드값('오늘 지급').innerText()).trim();
      await verify('지급을 보낸 뒤 대시보드를 열면 「오늘 지급」 카드가 UTC 0시 뒤에 보낸 지급 수와 같다', 카드, 숫자글(await 오늘지급수(page)));
    });
  } finally {
    if (지급번호 > 0) await 지급치우기(page, 지급번호);
  }
});
