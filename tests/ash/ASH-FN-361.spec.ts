import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가입만, 계정지우기, 임의글자, 임의아이디 } from './helpers/game-state.helper.js';
import { 가입된수 } from './helpers/bot-auth.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-361',
  name: '10자 비밀번호로 가입하면 201 이다',
  platforms: ['android'],
  precondition: ['가입하지 않은 아이디가 있다'],
  params: z.object({
    글자수: z.number().int().min(6).max(64).describe('가입할 비밀번호 글자 수 — 6자 이상 64자 이하').default(10),
  }),
  expected: null,
});

test(spec, async ({ admin, request, params }) => {
  let 아이디 = '';
  let 만든계정: string | undefined;
  try {
    await test.step('가입하지 않은 아이디를 짓는다', async () => {
      아이디 = 임의아이디('zqa361');
    });

    await test.step('가입하지 않은 아이디인지 확인한다', async () => {
      await verify('가입하지 않은 아이디가 있다', await 가입된수(admin, 아이디), 0, { blocker: true });
    });

    await test.step('10자 비밀번호로 가입한다', async () => {
      const 응답 = await 가입만(request, 아이디, 임의글자(params.글자수));
      if (응답.status() === 201) 만든계정 = 아이디;
      await verify('10자 비밀번호로 가입하면 201 이다', 응답.status(), 201);
    });
  } finally {
    if (만든계정 !== undefined) await 계정지우기(admin, 만든계정);
  }
});
