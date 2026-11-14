import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자로그인, 인증헤더 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-170',
  name: '「운영자」 토큰으로 GET /opsapi/me 를 부르면 그 운영자의 id · userName · displayName 이 돌아온다',
  apiDoc: 2,
  precondition: ['「운영자」 계정이 있다'],
  params: z.object({
    opsId: z.string().describe('운영자 아이디').optional().meta({ secret: true, account: '운영자' }),
    opsPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true, account: '운영자' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ request, params, expected }) => {
  let 토큰 = '';
  let 로그인운영자: { id?: number; userName?: string; displayName?: string } = {};
  await test.step('「운영자」로 로그인해 토큰을 받는다', async () => {
    const 응답 = await 운영자로그인(request, params.opsId ?? '', params.opsPassword ?? '');
    await verify('「운영자」 로그인 응답 코드가 200 이다', 응답.status(), 200, { blocker: true });
    const 몸 = (await 응답.json().catch(() => ({}))) as { token?: string; operator?: { id?: number; userName?: string; displayName?: string } };
    토큰 = 몸.token ?? '';
    로그인운영자 = 몸.operator ?? {};
    await verify('「운영자」 토큰을 받았다', 토큰 !== '', true, { blocker: true });
  });
  await test.step('「운영자」 토큰으로 GET /opsapi/me 를 부른다', async () => {
    const 응답 = await request.get('/opsapi/me', { headers: 인증헤더(토큰) });
    const 몸 = (await 응답.json().catch(() => ({}))) as { id?: number; userName?: string; displayName?: string };
    const 코드 = await verify('GET /opsapi/me 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 번호 = await verify('응답 id 가 로그인한 운영자의 id 와 같다', 몸.id ?? 0, 로그인운영자.id ?? -1);
    const 이름 = await verify('응답 userName 이 로그인한 운영자의 userName 과 같다', 몸.userName ?? '', 로그인운영자.userName ?? '');
    const 표시 = await verify('응답 displayName 이 로그인한 운영자의 displayName 과 같다', 몸.displayName ?? '', 로그인운영자.displayName ?? '');
    await verify('「운영자」 토큰으로 GET /opsapi/me 를 부르면 그 운영자의 id · userName · displayName 이 돌아온다', 코드 && 번호 && 이름 && 표시, true);
  });
});
