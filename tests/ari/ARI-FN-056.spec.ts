import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 본문JSON } from './helpers/api.helper.js';
import { 서버로그인 } from './helpers/data.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-056',
  name: '맞는 공유 비밀로 POST /api/serverlogin 을 부르면 200 과 accountId 0 · 서버 토큰이 돌아온다',
  apiDoc: 2,
  precondition: ['「게임 서버」 계정이 있다'],
  params: z.object({
    serverPassword: z.string().describe('게임 서버 공유 비밀').optional().meta({ secret: true, account: '게임 서버' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
    계정번호: z.number().describe('응답 accountId').default(0),
  }),
});

test(spec, async ({ request, params, expected }) => {
  await test.step('맞는 공유 비밀로 POST /api/serverlogin 을 부른다', async () => {
    const 응답 = await 서버로그인(request, params.serverPassword ?? '');
    const 코드 = await verify('POST /api/serverlogin 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 몸 = await 본문JSON<{ accountId?: number; token?: string }>(응답).catch(() => ({}) as { accountId?: number; token?: string });
    const 계정 = await verify('응답 accountId 가 기대 결과와 같다', 몸.accountId ?? -1, expected.계정번호);
    const 토큰 = await verify('응답에 점 둘로 나뉜 서버 토큰이 있다', (몸.token ?? '').split('.').length === 3, true);
    await verify('맞는 공유 비밀로 POST /api/serverlogin 을 부르면 200 과 accountId 0 · 서버 토큰이 돌아온다', 코드 && 계정 && 토큰, true);
  });
});
