import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 시험사유, 없는계정번호 } from './helpers/sanction.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { opsGet, 제재걸기 } from './helpers/ops-api.helper.js';

export const spec = defineCase({
  tcId: 'ARO-FN-246',
  name: '없는 계정 번호로 API 제재를 걸면 「유저를 찾을 수 없습니다」가 온다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  await test.step('운영자 계정으로 로그인한다', async () => {
    await 운영자쿠키받기(page, params.loginId, params.loginPassword);
  });

  await test.step('운영 API 가 응답하는지 확인한다', async () => {
    await verify('운영 API 가 200 으로 응답한다', (await opsGet(page, '/summary')).status, 200, { blocker: true });
  });

  await test.step('API 로 없는 계정 번호에 정지를 건다', async () => {
    const 번호 = await 없는계정번호(page);
    const 응답 = await 제재걸기(page, 번호, { type: 'SUSPEND', reason: 시험사유('ARO-FN-246'), endsAt: new Date(Date.now() + 3_600_000).toISOString() });
    const 코드 = await verify('응답 코드가 404 이다', 응답.status, 404);
    const 문구 = await verify('안내 문구가 「유저를 찾을 수 없습니다」다', 응답.body.message, '유저를 찾을 수 없습니다');
    await verify('없는 계정 번호로 API 제재를 걸면 「유저를 찾을 수 없습니다」가 온다', 코드 && 문구, true);
  });
});
