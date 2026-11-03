import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가입, 본문, 새비밀번호, 새아이디 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-631',
  name: '새 아이디로 가입하면 응답 코드가 기대값과 같다',
  apiDoc: 1,
  precondition: ['가입하지 않은 새 아이디다'],
  params: null,
  expected: z.object({
    가입응답코드: z.number().int().describe('가입이 됐을 때의 응답 코드 — 기획서는 201 · API 문서 판 1 은 200').default(201),
  }),
});

test(spec, async ({ request, expected }) => {
  await test.step('새 아이디와 비밀번호로 가입한다', async () => {
    const 응답 = await 가입(request, 새아이디(), 새비밀번호());
    const 있음 = await verify('가입 응답에 「accountId」가 있다', (await 본문(응답)).accountId !== undefined, true);
    const 코드 = await verify('가입 응답 코드가 기대값과 같다', 응답.status(), expected.가입응답코드);
    await verify('새 아이디로 가입하면 응답 코드가 기대값과 같다', 코드 && 있음, true);
  });
});
