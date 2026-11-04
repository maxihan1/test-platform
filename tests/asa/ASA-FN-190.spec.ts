import { defineCase, test, verify } from '@platform/kit';

import { 가방읽기, GM아이템, 값읽기, 플레이어만들기, type 가방, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-190',
  name: '짧은 검 둘을 받으면 가방의 「used」가 2 늘어난다',
  apiDoc: 1,
  precondition: ['새 캐릭터가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 나!: 플레이어;
  let 받기전칸수 = -1;

  await test.step('일회용 계정으로 새 캐릭터를 만든다', async () => {
    나 = await 플레이어만들기(request);
  });

  await test.step('새 캐릭터가 만들어졌는지 확인한다', async () => {
    받기전칸수 = (await 가방읽기(request, 나)).used;
    await verify('새 캐릭터 번호가 돌아온다', 나.캐릭터번호 > 0, true, {
      blocker: true,
    });
    await verify('가방 칸수를 읽었다', 받기전칸수 >= 0, true, {
      blocker: true,
    });
  });

  await test.step('GM 으로 짧은 검 둘을 받는다', async () => {
    const 지금 = await 값읽기<가방>(await GM아이템(request, 나, 'sword_short', 2));
    await verify('짧은 검 둘을 받으면 가방의 「used」가 2 늘어난다', 지금.used - 받기전칸수, 2);
  });
});
