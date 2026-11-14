import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 필터화면 } from './pages/filters.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-734',
  name: '필터가 없을 때 필터 화면을 열면 「필터가 없습니다.」가 보인다',
  precondition: ['두 번째 사용자로 로그인해 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    secondId: z.string().describe('두 번째 사용자 이메일').optional().meta({ secret: true, account: '두 번째 사용자' }),
    secondPassword: z.string().describe('두 번째 사용자 암호').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: null,
});
test(spec, async ({ page, params }) => {
  const 필터 = new 필터화면(page);

  await test.step('필터가 없는 두 번째 사용자로 필터 화면을 연다', async () => {
    await 로그인하기(page, params.secondId, params.secondPassword);
    await 필터.열기();
    await verify('필터가 없을 때 필터 화면을 열면 「필터가 없습니다.」가 보인다', await 필터.비었음.isVisible(), true);
  });
});
