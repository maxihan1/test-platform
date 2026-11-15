import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { apiGet, 몸 } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 유행중화면 } from './pages/explore.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-164',
  name: '로그인 후 유행 중 「사람들」 탭에 「mastodon.maxihan.com에서 인기」 카드가 보인다',
  precondition: ['두 번째 사용자로 로그인해 있다', '추천할 사람이 있다'],
  params: z.object({
    secondId: z.string().describe('두 번째 사용자 이메일').optional().meta({ secret: true, account: '두 번째 사용자' }),
    secondPassword: z.string().describe('두 번째 사용자 암호').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 유행 = new 유행중화면(page);

  await test.step('두 번째 사용자로 로그인하고 유행 중을 연다', async () => {
    await 로그인하기(page, params.secondId, params.secondPassword);
    await 유행.열기();
    await verify('유행 중 화면에 「사람들」 탭이 보인다', await 유행.사람들탭.isVisible(), true, { blocker: true });
    const 추천 = await 몸<unknown[]>(await apiGet(page, '/api/v2/suggestions?limit=20'));
    await verify('추천할 사람이 있다', 추천.length > 0, true, { blocker: true });
  });

  await test.step('로그인 후 유행 중 「사람들」 탭을 연다', async () => {
    await 유행.사람들탭.click();
    const 떴다 = await 유행.영역글('mastodon.maxihan.com에서 인기').waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('로그인 후 유행 중 「사람들」 탭에 「mastodon.maxihan.com에서 인기」 카드가 보인다', 떴다, true);
  });
});
