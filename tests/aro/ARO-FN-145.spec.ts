import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 로그인상태인가, 숫자글 } from './helpers/maintenance-dash.helper.js';
import { 계정번호, 계정목록, 새제재걸기, 적용중제재풀기 } from './helpers/ops-api.helper.js';
import { 대시보드화면 } from './pages/dashboard.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-145',
  name: 'qa_player2 에 정지를 건 뒤 대시보드를 열면 「정지 중 계정」 카드가 정지 중인 계정 수와 같다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 대시보드 = new 대시보드화면(page);
  let 계정 = 0;

  try {
    await test.step('운영자 계정으로 로그인하고 qa_player2 의 정지를 풀어 둔다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      계정 = await 계정번호(page, 'qa_player2');
      await 적용중제재풀기(page, 계정, 'SUSPEND');
      await verify('운영자 세션이 열려 있다', await 로그인상태인가(page), true, { blocker: true });
    });

    await test.step('API 로 qa_player2 에 정지를 건 뒤 대시보드를 연다', async () => {
      await 새제재걸기(page, 계정, 'SUSPEND', '[QA] ARO-FN-145 ' + String(Date.now()));
      await 대시보드.열기();
      const 카드 = (await 대시보드.카드값('정지 중 계정').innerText()).trim();
      const 정지수 = (await 계정목록(page)).items.filter((줄) => 줄.suspended).length;
      await verify('qa_player2 에 정지를 건 뒤 대시보드를 열면 「정지 중 계정」 카드가 정지 중인 계정 수와 같다', 카드, 숫자글(정지수));
    });
  } finally {
    if (계정 > 0) await 적용중제재풀기(page, 계정, 'SUSPEND');
  }
});
