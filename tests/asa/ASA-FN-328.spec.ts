import { defineCase, test, verify } from '@platform/kit';

import { 값읽기, GM설정, 플레이어만들기, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-328',
  name: 'GM 설정의 악명 봇 전리품 확률이 80% 다',
  apiDoc: 2,
  precondition: ['로그인한 캐릭터가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 나!: 플레이어;

  await test.step('일회용 계정으로 캐릭터를 만든다', async () => {
    나 = await 플레이어만들기(request);
  });

  await test.step('캐릭터가 만들어졌는지 확인한다', async () => {
    await verify('캐릭터 번호가 돌아온다', 나.캐릭터번호 > 0, true, {
      blocker: true,
    });
  });

  await test.step('GM 설정의 봇 전리품 확률을 읽는다', async () => {
    const 설정 = await 값읽기<{ drop?: { botLootChanceChaotic?: number } }>(await GM설정(request, 나));
    await verify('GM 설정의 악명 봇 전리품 확률이 80% 다', 설정.drop?.botLootChanceChaotic, 0.8);
  });
});
