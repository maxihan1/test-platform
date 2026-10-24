import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 새캐릭터, 응답몸, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';
import { 내캐릭터읽기 } from './helpers/bot-auth.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-328',
  name: '전사 캐릭터를 읽으면 classType 이 문자열 「Warrior」다',
  platforms: ['android'],
  precondition: ['전사 새 캐릭터가 있다'],
  elements: ['class:Warrior'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('전사 새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa328', 'Warrior');
    });

    await test.step('전사 새 캐릭터가 있는지 확인한다', async () => {
      await verify('전사 새 캐릭터가 있다', (await 캐릭터읽기(admin, 나!)).classType, 'Warrior', { blocker: true });
    });

    await test.step('캐릭터를 읽는다', async () => {
      const 응답 = await 내캐릭터읽기(admin, 나!);
      await verify('캐릭터 읽기 응답이 200 이다', 응답.status(), 200);
      const 몸 = await 응답몸<{ classType?: unknown }>(응답);
      await verify('전사 캐릭터를 읽으면 classType 이 문자열 「Warrior」다', 몸.classType, 'Warrior');
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
