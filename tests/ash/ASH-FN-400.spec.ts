import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 새계정, 응답몸, 임의글자, 플레이어머리, type 계정 } from './helpers/game-state.helper.js';
import { 캐릭터만들기응답 } from './helpers/bot-auth.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-400',
  name: '캐릭터를 만들면 201 이고 본문에 id · name · classType · level · stats · alignment 가 있다',
  platforms: ['android'],
  precondition: ['로그인한 계정이 있다'],
  smoke: true,
  elements: ['class:Warrior'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 계정 | undefined;
  try {
    await test.step('로그인한 계정을 만든다', async () => {
      나 = await 새계정(admin, 'zqa400');
    });

    await test.step('로그인한 계정의 토큰이 통하는지 확인한다', async () => {
      const 응답 = await admin.get('/characters', { headers: 플레이어머리(나!) });
      await verify('로그인한 계정이 있다', 응답.status(), 200, { blocker: true });
    });

    await test.step('전사 캐릭터를 만든다', async () => {
      const 응답 = await 캐릭터만들기응답(admin, 나!, `zq${임의글자(8)}`);
      const 코드 = await verify('응답 코드가 201 이다', 응답.status(), 201);
      const 몸 = await 응답몸<Record<string, unknown>>(응답);
      const 빠짐 = ['id', 'name', 'classType', 'level', 'stats', 'alignment'].filter((키) => !(키 in 몸)).join(', ');
      const 필드 = await verify('본문에 빠진 필드가 없다', 빠짐, '');
      await verify('캐릭터를 만들면 201 이고 본문에 id · name · classType · level · stats · alignment 가 있다', 코드 && 필드, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
