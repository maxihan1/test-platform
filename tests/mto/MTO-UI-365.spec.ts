import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정번호 } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 계정상세화면 } from './pages/account-detail.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-365',
  name: 'newbie_wait 계정 상세에 가입하려는 이유 말풍선이 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '승인 대기 계정(newbie_wait)이 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 상세 = new 계정상세화면(page);

  await test.step('Owner 계정으로 로그인하고 승인 대기 계정을 확인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 상세.열기(await 계정번호(page, 'newbie_wait'));
    await verify('승인 대기 계정(newbie_wait)이 있다', (await 상세.제목.innerText()).trim(), 'newbie_wait', { blocker: true });
  });

  await test.step('newbie_wait 계정 상세를 연다', async () => {
    await verify('newbie_wait 계정 상세에 가입하려는 이유 말풍선이 보인다', await 상세.가입이유말풍선.isVisible(), true);
  });
});
