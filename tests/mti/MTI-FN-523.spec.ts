import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리, 앱만들기, 앱토큰받기, 토큰폐기 } from './helpers/auth.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-523',
  name: '폐기한 토큰으로 부르면 응답 코드가 401 이다',
  apiDoc: 1,
  precondition: ['시험 앱 토큰을 폐기해 두었다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(401),
    오류문구: z.string().describe('오류 문구').default('액세스 토큰이 삭제되었습니다.'),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, expected }) => {
  const 앱 = await 앱만들기(request, 'read');
  const 앱토큰 = await 앱토큰받기(request, 앱, 'read');
  const 폐기코드 = await 토큰폐기(request, 앱, 앱토큰);
  await test.step('폐기한 시험 앱 토큰을 확인한다', async () => {
    await verify('시험 앱 토큰을 폐기해 두었다', 앱토큰 !== '' && 폐기코드 === 200, true, { blocker: true });
  });
  await test.step('폐기한 토큰으로 GET /api/v1/apps/verify_credentials 를 부른다', async () => {
    const 응답 = await request.get('/api/v1/apps/verify_credentials', { headers: 머리(앱토큰) });
    await verify('폐기한 토큰으로 부르면 응답 코드가 401 이다', 응답.status(), expected.응답코드);
    const 몸 = (await 응답.json()) as { error?: string };
    await verify('오류 문구가 「액세스 토큰이 삭제되었습니다.」 다', 몸.error, expected.오류문구);
  });
});
