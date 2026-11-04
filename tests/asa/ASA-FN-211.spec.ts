import { defineCase, test, verify } from '@platform/kit';

import { 가방읽기, 값읽기, 사기, 플레이어만들기, type 가방, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-211',
  name: '빨간 물약 하나를 사면 골드가 30 준다',
  apiDoc: 2,
  precondition: ['골드 500 인 캐릭터가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 나!: 플레이어;
  let 사기전골드 = -1;

  await test.step('일회용 계정으로 새 캐릭터를 만든다', async () => {
    나 = await 플레이어만들기(request);
  });

  await test.step('골드 500 인 캐릭터를 확인한다', async () => {
    사기전골드 = (await 가방읽기(request, 나)).gold;
    await verify('새 캐릭터 번호가 돌아온다', 나.캐릭터번호 > 0, true, {
      blocker: true,
    });
    await verify('캐릭터 골드가 500 이다', 사기전골드, 500, { blocker: true });
  });

  await test.step('상점에서 빨간 물약 하나를 산다', async () => {
    const 지금 = await 값읽기<가방>(await 사기(request, 나, 'potion_hp_s', 1));
    await verify('빨간 물약 하나를 사면 골드가 30 준다', 사기전골드 - 지금.gold, 30);
  });
});
