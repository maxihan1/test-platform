import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정지우기, 새계정, 임의글자, 플레이어머리, type 계정 } from './helpers/game-state.helper.js';
import { 캐릭터만들기응답 } from './helpers/bot-auth.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-394',
  name: '6자 이름으로 캐릭터를 만들면 201 이다',
  platforms: ['android'],
  precondition: ['로그인한 계정이 있다'],
  params: z.object({
    글자수: z.number().int().min(3).max(12).describe('만들 캐릭터 이름 글자 수 — 3자 이상 12자 이하').default(6),
  }),
  expected: null,
});

test(spec, async ({ admin, params }) => {
  let 나: 계정 | undefined;
  try {
    await test.step('로그인한 계정을 만든다', async () => {
      나 = await 새계정(admin, 'zqa394');
    });

    await test.step('로그인한 계정의 토큰이 통하는지 확인한다', async () => {
      const 응답 = await admin.get('/characters', { headers: 플레이어머리(나!) });
      await verify('로그인한 계정이 있다', 응답.status(), 200, { blocker: true });
    });

    await test.step('6자 이름으로 캐릭터를 만든다', async () => {
      const 응답 = await 캐릭터만들기응답(admin, 나!, `q${임의글자(params.글자수 - 1)}`);
      await verify('6자 이름으로 캐릭터를 만들면 201 이다', 응답.status(), 201);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
