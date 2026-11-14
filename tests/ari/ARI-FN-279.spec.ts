import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 이동경로 } from './helpers/html.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-279',
  name: 'GET /Account 를 부르면 302 로 홈으로 이동한다',
  apiDoc: 2,
  precondition: ['대상 서버에 접근할 수 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(302),
  }),
});

test(spec, async ({ request, expected }) => {
  await test.step('이동을 따라가지 않고 GET /Account 를 부른다', async () => {
    const 응답 = await request.get('/Account', { maxRedirects: 0 });
    const 코드 = await verify('GET /Account 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 주소 = await verify('이동 주소가 홈 「/」다', 이동경로(응답), '/');
    await verify('GET /Account 를 부르면 302 로 홈으로 이동한다', 코드 && 주소, true);
  });
});
