import { defineCase, test, verify } from '@platform/kit';

import { 봇목록, 살아있는봇들, 줍기 } from './helpers/combat.helper.js';
import { 떨어진아이템만들기 } from './helpers/loot.helper.js';
import { 플레이어만들기, type 바닥아이템, type 봇, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-364',
  name: '봇이 바닥 아이템을 주우면 그 봇의 「itemCount」가 1 는다',
  apiDoc: 2,
  precondition: ['바닥 아이템과 살아 있는 봇이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 나!: 플레이어;
  let 바닥: 바닥아이템 | undefined;
  let 대상: 봇 | undefined;

  await test.step('일회용 계정으로 캐릭터를 만들고 바닥에 아이템을 떨어뜨린 뒤 초록 들판의 살아 있는 봇을 고른다', async () => {
    나 = await 플레이어만들기(request);
    바닥 = (await 떨어진아이템만들기(request, true)).바닥;
    대상 = (await 살아있는봇들(request, 나, (b) => b.zone === 'Beginner'))[0];
  });

  await test.step('바닥 아이템과 살아 있는 봇을 확인한다', async () => {
    await verify('죽어 떨어뜨린 바닥 아이템이 있다', 바닥 !== undefined, true, {
      blocker: true,
    });
    await verify('초록 들판에 살아 있는 봇이 있다', 대상 !== undefined, true, {
      blocker: true,
    });
  });

  await test.step('그 봇 번호를 넣어 바닥 아이템을 줍는다', async () => {
    if (바닥 === undefined || 대상 === undefined) return;
    const 전 = (await 봇목록(request, 나)).find((b) => b.id === 대상?.id)?.itemCount;
    await 줍기(request, 나, 바닥.id, { x: 바닥.x, z: 바닥.z }, 대상.id);
    const 후 = (await 봇목록(request, 나)).find((b) => b.id === 대상?.id)?.itemCount;
    const 늘어난수 = 전 === undefined || 후 === undefined ? undefined : 후 - 전;
    await verify('봇이 바닥 아이템을 주우면 그 봇의 「itemCount」가 1 는다', 늘어난수, 1);
  });
});
