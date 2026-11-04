import { defineCase, test, verify } from '@platform/kit';

import { GM골드, 캐릭터읽기, 플레이어만들기, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-397',
  name: 'GM 골드로 500 보다 많이 빼려 하면 골드가 0 아래로 내려가지 않는다',
  apiDoc: 2,
  precondition: ['골드 500 인 캐릭터가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 나!: 플레이어;

  await test.step('일회용 계정으로 캐릭터를 만든다', async () => {
    나 = await 플레이어만들기(request);
  });

  await test.step('골드 500 인 캐릭터를 확인한다', async () => {
    const 지금 = await 캐릭터읽기(request, 나);
    await verify('캐릭터 골드가 500 이다', 지금.gold, 500, { blocker: true });
  });

  await test.step('GM 골드 −600 을 준다', async () => {
    await GM골드(request, 나, -600);
    const 지금 = await 캐릭터읽기(request, 나);
    await verify('GM 골드로 500 보다 많이 빼려 하면 골드가 0 아래로 내려가지 않는다', 지금.gold < 0, false);
  });
});
