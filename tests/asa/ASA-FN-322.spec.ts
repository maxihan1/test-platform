import { defineCase, test, verify } from '@platform/kit';

import { 줍기 } from './helpers/combat.helper.js';
import { 떨어진아이템만들기, 템플릿수량 } from './helpers/loot.helper.js';
import { 가방읽기, 플레이어만들기, type 바닥아이템, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-322',
  name: '다른 캐릭터가 떨어뜨린 아이템을 주우면 내 가방에 들어온다',
  apiDoc: 2,
  precondition: ['다른 캐릭터가 죽어 떨어뜨린 바닥 아이템이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 나!: 플레이어;
  let 바닥: 바닥아이템 | undefined;

  await test.step('일회용 계정으로 내 캐릭터를 만들고 다른 캐릭터가 죽어 아이템을 떨어뜨리게 한다', async () => {
    나 = await 플레이어만들기(request);
    바닥 = (await 떨어진아이템만들기(request)).바닥;
  });

  await test.step('다른 캐릭터가 떨어뜨린 바닥 아이템을 확인한다', async () => {
    await verify('죽어 떨어뜨린 바닥 아이템이 있다', 바닥 !== undefined, true, {
      blocker: true,
    });
  });

  await test.step('내 캐릭터로 그 아이템을 줍는다', async () => {
    if (바닥 === undefined) return;
    const 전 = 템플릿수량(await 가방읽기(request, 나), 바닥.templateId);
    await 줍기(request, 나, 바닥.id, { x: 바닥.x, z: 바닥.z });
    const 후 = 템플릿수량(await 가방읽기(request, 나), 바닥.templateId);
    await verify('다른 캐릭터가 떨어뜨린 아이템을 주우면 내 가방에 들어온다', 후 > 전, true);
  });
});
