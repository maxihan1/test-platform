import { defineCase, test, verify } from '@platform/kit';

import type { 상점응답 } from './helpers/enhance.helper.js';
import { 가방읽기, GM성향, 값읽기, 사기, 상점목록, 캐릭터읽기, 플레이어만들기, type 가방, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-214',
  name: '악명 캐릭터가 상점 목록을 부르면 「priceMultiplier」가 1.2 다',
  apiDoc: 1,
  precondition: ['성향치가 0 보다 작은 캐릭터가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 나!: 플레이어;
  let 사기전골드 = -1;

  await test.step('일회용 계정으로 새 캐릭터를 만들고 성향치를 0 보다 작게 바꾼다', async () => {
    나 = await 플레이어만들기(request);
    await GM성향(request, 나, -100);
  });

  await test.step('성향치가 0 보다 작은 캐릭터를 확인한다', async () => {
    const 캐릭터 = await 캐릭터읽기(request, 나);
    사기전골드 = (await 가방읽기(request, 나)).gold;
    await verify('새 캐릭터 번호가 돌아온다', 나.캐릭터번호 > 0, true, {
      blocker: true,
    });
    await verify('캐릭터 성향치가 0 보다 작다', 캐릭터.alignment.value < 0, true, { blocker: true });
  });

  await test.step('상점 목록을 부른다', async () => {
    const 목록 = await 값읽기<상점응답>(await 상점목록(request, 나));
    await verify('악명 캐릭터가 상점 목록을 부르면 「priceMultiplier」가 1.2 다', 목록.priceMultiplier, 1.2);
  });

  await test.step('상점에서 빨간 물약 하나를 산다', async () => {
    const 지금 = await 값읽기<가방>(await 사기(request, 나, 'potion_hp_s', 1));
    await verify('악명 캐릭터가 빨간 물약 하나를 사면 골드가 36 준다', 사기전골드 - 지금.gold, 36);
  });
});
