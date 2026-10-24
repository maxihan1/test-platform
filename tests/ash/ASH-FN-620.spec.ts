import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정지우기, 새계정, 오류코드, 플레이어머리, type 계정 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-620',
  name: '리프레시 토큰은 14일이 지나면 401 「INVALID_REFRESH_TOKEN」이다',
  platforms: ['android'],
  precondition: ['로그인한 계정이 있다'],
  held: '보류 — 14일을 기다릴 길이 없음',
  params: z.object({
    열네날지난리프레시: z.string().describe('14일이 지난 리프레시 토큰 — 14일 전에 받아 둔 것을 사람이 채운다').meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ admin, request, params }) => {
  let 나: 계정 | undefined;
  try {
    await test.step('로그인한 계정을 만든다', async () => {
      나 = await 새계정(admin, 'zqa620');
    });

    await test.step('로그인한 계정의 토큰이 통하는지 확인한다', async () => {
      const 응답 = await admin.get('/characters', { headers: 플레이어머리(나!) });
      await verify('로그인한 계정이 있다', 응답.status(), 200, { blocker: true });
    });

    await test.step('14일 뒤 리프레시 토큰으로 리프레시한다', async () => {
      const 응답 = await request.post('/auth/refresh', { data: { refreshToken: params.열네날지난리프레시 } });
      const 코드 = await verify('응답 코드가 401 이다', 응답.status(), 401);
      const 이름 = await verify('오류 코드가 「INVALID_REFRESH_TOKEN」이다', await 오류코드(응답), 'INVALID_REFRESH_TOKEN');
      await verify('리프레시 토큰은 14일이 지나면 401 「INVALID_REFRESH_TOKEN」이다', 코드 && 이름, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
