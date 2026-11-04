import { defineCase, test, verify } from '@platform/kit';

import { 몬스터처치, 스폰고르기 } from './helpers/combat.helper.js';
import { 가방읽기, 플레이어만들기, type 스폰, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-154',
  name: '임프를 처치해도 가방 아이템 수가 그대로다',
  apiDoc: 2,
  precondition: ['캐릭터가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 나!: 플레이어;
  let 자리: 스폰 | undefined;
  let 처치전수 = -1;

  await test.step('일회용 계정으로 캐릭터를 만들고 임프 스폰을 고른다', async () => {
    나 = await 플레이어만들기(request);
    자리 = (await 스폰고르기(request, 나, 'Imp'))[0];
  });

  await test.step('캐릭터와 임프 스폰이 있는지 확인한다', async () => {
    await verify('캐릭터 번호가 돌아온다', 나.캐릭터번호 > 0, true, {
      blocker: true,
    });
    await verify('고를 임프 스폰이 있다', 자리 !== undefined, true, {
      blocker: true,
    });
    처치전수 = (await 가방읽기(request, 나)).items.length;
  });

  await test.step('임프를 처치한 뒤 가방을 읽는다', async () => {
    if (자리 === undefined) return;
    await 몬스터처치(request, 나, 자리);
    const 지금 = await 가방읽기(request, 나);
    await verify('임프를 처치해도 가방 아이템 수가 그대로다', 지금.items.length, 처치전수);
  });
});
