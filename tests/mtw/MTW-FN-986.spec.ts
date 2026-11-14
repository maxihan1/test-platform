import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { apiGet, 몸 } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 필터화면 } from './pages/filters.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-986',
  name: '필터 만들기에서 칸을 비우고 저장하면 필터가 만들어지지 않는다',
  precondition: ['일반 회원으로 로그인해 있다'],
  techniques: ['오류 추정'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});
test(spec, async ({ page, params }) => {
  const 필터 = new 필터화면(page);
  let 앞수 = 0;

  await test.step('일반 회원으로 로그인하고 필터 수를 센다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    앞수 = (await 몸<unknown[]>(await apiGet(page, '/api/v2/filters'))).length;
    await 필터.새로열기();
    await verify('필터 만들기 화면에 「제목」 칸이 보인다', await 필터.새제목칸.isVisible(), true, { blocker: true });
  });

  await test.step('필터 만들기에서 제목과 키워드를 비우고 「새 필터 저장」을 누른다', async () => {
    await 필터.저장하기();
    const 뒤수 = (await 몸<unknown[]>(await apiGet(page, '/api/v2/filters'))).length;
    await verify('필터 만들기에서 칸을 비우고 저장하면 필터가 만들어지지 않는다', 뒤수, 앞수);
  });
});
