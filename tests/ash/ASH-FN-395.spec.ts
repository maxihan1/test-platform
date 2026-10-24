import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정지우기, 새계정, 오류코드, 플레이어머리, type 계정 } from './helpers/game-state.helper.js';
import { 임의한글, 캐릭터만들기응답 } from './helpers/bot-auth.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-395',
  name: '1자 이름으로 캐릭터를 만들면 400 「VALIDATION_FAILED」다',
  platforms: ['android'],
  precondition: ['로그인한 계정이 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    짧은글자수: z.number().int().min(1).max(1).describe('너무 짧은 이름 글자 수 — 1자').default(1),
    하한글자수: z.number().int().min(2).max(12).describe('가장 짧게 만들어지는 이름 글자 수 — 2자 이상 12자 이하').default(2),
    상한글자수: z.number().int().min(2).max(12).describe('가장 길게 만들어지는 이름 글자 수 — 2자 이상 12자 이하').default(12),
    긴글자수: z.number().int().min(13).max(30).describe('너무 긴 이름 글자 수 — 13자 이상 30자 이하').default(13),
  }),
  expected: null,
});

test(spec, async ({ admin, params }) => {
  let 나: 계정 | undefined;
  try {
    await test.step('로그인한 계정을 만든다', async () => {
      나 = await 새계정(admin, 'zqa395');
    });

    await test.step('로그인한 계정의 토큰이 통하는지 확인한다', async () => {
      const 응답 = await admin.get('/characters', { headers: 플레이어머리(나!) });
      await verify('로그인한 계정이 있다', 응답.status(), 200, { blocker: true });
    });

    await test.step('1자 이름으로 캐릭터를 만든다', async () => {
      const 응답 = await 캐릭터만들기응답(admin, 나!, 임의한글(params.짧은글자수));
      const 코드 = await verify('1자 이름의 응답 코드가 400 이다', 응답.status(), 400);
      const 이름 = await verify('1자 이름의 오류 코드가 「VALIDATION_FAILED」다', await 오류코드(응답), 'VALIDATION_FAILED');
      await verify('1자 이름으로 캐릭터를 만들면 400 「VALIDATION_FAILED」다', 코드 && 이름, true);
    });

    await test.step('2자 이름으로 캐릭터를 만든다', async () => {
      const 응답 = await 캐릭터만들기응답(admin, 나!, 임의한글(params.하한글자수));
      await verify('2자 이름으로 캐릭터를 만들면 201 이다', 응답.status(), 201);
    });

    await test.step('12자 이름으로 캐릭터를 만든다', async () => {
      const 응답 = await 캐릭터만들기응답(admin, 나!, 임의한글(params.상한글자수));
      await verify('12자 이름으로 캐릭터를 만들면 201 이다', 응답.status(), 201);
    });

    await test.step('13자 이름으로 캐릭터를 만든다', async () => {
      const 응답 = await 캐릭터만들기응답(admin, 나!, 임의한글(params.긴글자수));
      const 코드 = await verify('13자 이름의 응답 코드가 400 이다', 응답.status(), 400);
      const 이름 = await verify('13자 이름의 오류 코드가 「VALIDATION_FAILED」다', await 오류코드(응답), 'VALIDATION_FAILED');
      await verify('13자 이름으로 캐릭터를 만들면 400 「VALIDATION_FAILED」다', 코드 && 이름, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
