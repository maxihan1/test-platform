import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 새계정, 임의글자, 플레이어머리, type 계정 } from './helpers/game-state.helper.js';
import { 임의한글, 캐릭터만들기응답 } from './helpers/bot-auth.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-397',
  name: '한글 · 영문 · 숫자를 섞은 이름으로 캐릭터를 만들면 201 이다',
  platforms: ['android'],
  precondition: ['로그인한 계정이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 계정 | undefined;
  try {
    await test.step('로그인한 계정을 만든다', async () => {
      나 = await 새계정(admin, 'zqa397');
    });

    await test.step('로그인한 계정의 토큰이 통하는지 확인한다', async () => {
      const 응답 = await admin.get('/characters', { headers: 플레이어머리(나!) });
      await verify('로그인한 계정이 있다', 응답.status(), 200, { blocker: true });
    });

    await test.step('한글 · 영문 · 숫자를 섞은 이름으로 캐릭터를 만든다', async () => {
      const 응답 = await 캐릭터만들기응답(admin, 나!, `${임의한글(2)}q${임의글자(3)}1`);
      await verify('한글 · 영문 · 숫자를 섞은 이름으로 캐릭터를 만들면 201 이다', 응답.status(), 201);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
