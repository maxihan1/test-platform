import { defineCase, test, verify } from '@platform/kit';

import { 살아있는봇들, 줍기 } from './helpers/combat.helper.js';
import { 떨어진아이템만들기 } from './helpers/loot.helper.js';
import { 값읽기, 플레이어만들기, type 바닥아이템, type 봇, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-382',
  name: '「botId」를 넣어 주우면 「pickedByKind」가 「Bot」이다',
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
    바닥 = (await 떨어진아이템만들기(request)).바닥;
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
    const 응답 = await 줍기(request, 나, 바닥.id, { x: 바닥.x, z: 바닥.z }, 대상.id);
    const 값 = await 값읽기<{ pickedByKind?: string }>(응답);
    await verify('「botId」를 넣어 주우면 「pickedByKind」가 「Bot」이다', 값.pickedByKind, 'Bot');
  });
});
