import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 앱만들기, 앱토큰받기 } from './helpers/auth.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-512',
  name: '같은 앱 · 같은 범위로 토큰을 두 번 받으면 두 access_token 이 같다',
  apiDoc: 1,
  precondition: ['시험 앱이 있다'],
  params: null,
  expected: z.object({
    같은토큰: z.boolean().describe('두 access_token 이 같은지').default(true),
  }),
});

test(spec, async ({ request, expected }) => {
  const 앱 = await 앱만들기(request, 'read');
  await test.step('시험 앱을 확인한다', async () => {
    await verify('시험 앱이 있다', 앱.client_id !== '', true, { blocker: true });
  });
  await test.step('같은 앱 · 같은 범위로 client_credentials 토큰을 두 번 받는다', async () => {
    const 처음 = await 앱토큰받기(request, 앱, 'read');
    const 다시 = await 앱토큰받기(request, 앱, 'read');
    await verify('같은 앱 · 같은 범위로 토큰을 두 번 받으면 두 access_token 이 같다', 처음 !== '' && 처음 === 다시, expected.같은토큰);
  });
});
