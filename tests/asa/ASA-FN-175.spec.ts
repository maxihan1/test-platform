import { defineCase, test, verify } from '@platform/kit';

import { 새아이템찾기 } from './helpers/enhance.helper.js';
import { GM아이템, 값읽기, 플레이어만들기, type 가방, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-175',
  name: '+1 숏 보우의 판매가가 157 이다',
  apiDoc: 2,
  precondition: ['로그인한 캐릭터가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 나!: 플레이어;

  await test.step('일회용 계정으로 새 캐릭터를 만든다', async () => {
    나 = await 플레이어만들기(request);
  });

  await test.step('로그인한 캐릭터가 있는지 확인한다', async () => {
    await verify('새 캐릭터 번호가 돌아온다', 나.캐릭터번호 > 0, true, {
      blocker: true,
    });
  });

  await test.step('GM 으로 +1 숏 보우를 받아 판매가를 읽는다', async () => {
    const 지금 = await 값읽기<가방>(await GM아이템(request, 나, 'bow_short', 1, 1));
    await verify('+1 숏 보우의 판매가가 157 이다', 새아이템찾기(지금, 'bow_short', 1)?.sellPrice, 157);
  });

  await test.step('GM 으로 +3 짧은 검을 받아 판매가를 읽는다', async () => {
    const 지금 = await 값읽기<가방>(await GM아이템(request, 나, 'sword_short', 1, 3));
    await verify('+3 짧은 검의 판매가가 250 이다', 새아이템찾기(지금, 'sword_short', 3)?.sellPrice, 250);
  });
});
