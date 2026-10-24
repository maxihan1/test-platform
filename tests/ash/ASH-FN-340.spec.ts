import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 몬스터처치, 새캐릭터, 순간이동, 스폰하나, type 캐릭터, type 스폰정보 } from './helpers/game-state.helper.js';
import { 오류필드 } from './helpers/bot-auth.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-340',
  name: '거부된 응답 본문에 code 와 message 가 있다',
  platforms: ['android'],
  precondition: ['임프를 방금 처치한 새 캐릭터가 있다'],
  elements: ['monster:Imp', 'zone:Beginner'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  let 스폰: 스폰정보 | undefined;
  let 첫째코드 = 0;
  try {
    await test.step('새 캐릭터로 임프를 처치한다', async () => {
      나 = await 새캐릭터(admin, 'zqa340');
      스폰 = await 스폰하나(admin, 'Beginner', 'Imp');
      await 순간이동(admin, 나, { x: 스폰.x, z: 스폰.z });
      첫째코드 = (await 몬스터처치(admin, 나, 스폰)).status();
    });

    await test.step('임프를 방금 처치했는지 확인한다', async () => {
      await verify('임프를 방금 처치했다', 첫째코드, 200, { blocker: true });
    });

    await test.step('같은 스폰을 바로 다시 처치한다', async () => {
      const 응답 = await 몬스터처치(admin, 나!, 스폰!);
      const 거부 = await verify('같은 스폰을 바로 다시 처치하면 거부된다', 응답.status() >= 400, true);
      const 필드 = await 오류필드(응답);
      const 코드 = await verify('응답 본문에 code 가 있다', typeof 필드.code === 'string' && 필드.code !== '', true);
      const 안내 = await verify('응답 본문에 message 가 있다', typeof 필드.message === 'string' && 필드.message !== '', true);
      await verify('거부된 응답 본문에 code 와 message 가 있다', 거부 && 코드 && 안내, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
