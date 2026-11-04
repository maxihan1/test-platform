import { defineCase, test, verify } from '@platform/kit';

import { 가방읽기, 플레이어만들기, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-187',
  name: '새 캐릭터 가방의 「capacity」가 40 이다',
  apiDoc: 2,
  precondition: ['새 캐릭터가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 나!: 플레이어;

  await test.step('일회용 계정으로 새 캐릭터를 만든다', async () => {
    나 = await 플레이어만들기(request);
  });

  await test.step('새 캐릭터가 만들어졌는지 확인한다', async () => {
    await verify('새 캐릭터 번호가 돌아온다', 나.캐릭터번호 > 0, true, {
      blocker: true,
    });
  });

  await test.step('가방을 읽는다', async () => {
    const 지금 = await 가방읽기(request, 나);
    await verify('새 캐릭터 가방의 「capacity」가 40 이다', 지금.capacity, 40);
  });
});
