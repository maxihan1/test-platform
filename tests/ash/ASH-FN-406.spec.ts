import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 새계정, 임의글자, type 계정 } from './helpers/game-state.helper.js';
import { 캐릭터만들기응답, 캐릭터수 } from './helpers/bot-auth.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-406',
  name: '캐릭터가 없는 계정은 캐릭터를 만들 수 있다',
  platforms: ['android'],
  precondition: ['캐릭터가 없는 새 계정이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 계정 | undefined;
  try {
    await test.step('캐릭터가 없는 새 계정을 만든다', async () => {
      나 = await 새계정(admin, 'zqa406');
    });

    await test.step('계정에 캐릭터가 없는지 확인한다', async () => {
      await verify('캐릭터가 없는 새 계정이 있다', await 캐릭터수(admin, 나!.아이디), 0, { blocker: true });
    });

    await test.step('캐릭터를 하나 만든다', async () => {
      const 응답 = await 캐릭터만들기응답(admin, 나!, `zq${임의글자(8)}`);
      await verify('캐릭터가 없는 계정은 캐릭터를 만들 수 있다', 응답.status(), 201);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
