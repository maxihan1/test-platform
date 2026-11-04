import { defineCase, test, verify } from '@platform/kit';

import { 몬스터처치, 스폰고르기 } from './helpers/combat.helper.js';
import { 값읽기, 캐릭터읽기, 플레이어만들기, type 스폰, type 캐릭터, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-295',
  name: '몬스터를 처치하면 성향치가 10 오른다',
  apiDoc: 2,
  precondition: ['성향치 0 인 캐릭터가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 나!: 플레이어;
  let 자리: 스폰 | undefined;

  await test.step('일회용 계정으로 캐릭터를 만들고 임프 스폰을 고른다', async () => {
    나 = await 플레이어만들기(request);
    자리 = (await 스폰고르기(request, 나, 'Imp'))[0];
  });

  await test.step('성향치 0 인 캐릭터와 임프 스폰을 확인한다', async () => {
    const 지금 = await 캐릭터읽기(request, 나);
    await verify('캐릭터 성향치가 0 이다', 지금.alignment.value, 0, {
      blocker: true,
    });
    await verify('고를 임프 스폰이 있다', 자리 !== undefined, true, {
      blocker: true,
    });
  });

  await test.step('임프를 처치한다', async () => {
    if (자리 === undefined) return;
    const 값 = await 값읽기<{ character?: Partial<캐릭터> }>(await 몬스터처치(request, 나, 자리));
    await verify('몬스터를 처치하면 성향치가 10 오른다', 값.character?.alignment?.value, 10);
  });
});
