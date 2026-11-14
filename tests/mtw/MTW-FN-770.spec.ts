import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 계정설정화면 } from './pages/account-settings.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-770',
  name: '별칭이 없을 때 별칭 화면을 열면 「별칭이 없습니다.」가 보인다',
  precondition: ['두 번째 사용자로 로그인해 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    secondId: z.string().describe('두 번째 사용자 이메일').optional().meta({ secret: true, account: '두 번째 사용자' }),
    secondPassword: z.string().describe('두 번째 사용자 암호').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: null,
});
test(spec, async ({ page, params }) => {
  const 설정 = new 계정설정화면(page);

  await test.step('별칭이 없는 두 번째 사용자로 별칭 화면을 연다', async () => {
    await 로그인하기(page, params.secondId, params.secondPassword);
    await 설정.열기('/settings/aliases');
    await verify('별칭이 없을 때 별칭 화면을 열면 「별칭이 없습니다.」가 보인다', await 설정.글('별칭이 없습니다.').isVisible(), true);
  });
});
