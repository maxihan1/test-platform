import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자토큰, 토큰본문 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-017',
  name: '「운영자」로 로그인해 받은 운영자 토큰을 열면 operatorId 와 operatorName 이 들어 있다',
  apiDoc: 2,
  precondition: ['「운영자」 계정이 있다'],
  params: z.object({
    opsId: z.string().describe('운영자 아이디').optional().meta({ secret: true, account: '운영자' }),
    opsPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true, account: '운영자' }),
  }),
  expected: null,
});

test(spec, async ({ request, params }) => {
  await test.step('「운영자」로 POST /opsapi/login 을 불러 받은 토큰 본문을 읽는다', async () => {
    const 받음 = await 운영자토큰(request, params.opsId ?? '', params.opsPassword ?? '');
    await verify('「운영자」 로그인 응답 코드가 200 이다', 받음.status, 200, { blocker: true });
    const 본문 = 토큰본문(받음.token);
    const 번호 = await verify('운영자 토큰 안에 operatorId 가 있다', 본문.operatorId !== undefined, true);
    const 이름 = await verify('운영자 토큰 안에 operatorName 이 있다', 본문.operatorName !== undefined, true);
    await verify('「운영자」로 로그인해 받은 운영자 토큰을 열면 operatorId 와 operatorName 이 들어 있다', 번호 && 이름, true);
  });
});
