import { defineCase, test, verify } from '@platform/kit';

import { 가방읽기, GM골드, 사기, 오류코드읽기, 플레이어만들기, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-222',
  name: '골드가 0 인 캐릭터가 빨간 물약을 사면 「INSUFFICIENT_GOLD」로 막힌다',
  apiDoc: 1,
  precondition: ['골드가 0 인 캐릭터가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 나!: 플레이어;

  await test.step('일회용 계정으로 새 캐릭터를 만들고 골드를 0 으로 맞춘다', async () => {
    나 = await 플레이어만들기(request);
    const 지금 = await 가방읽기(request, 나);
    await GM골드(request, 나, -지금.gold);
  });

  await test.step('골드가 0 인 캐릭터를 확인한다', async () => {
    const 지금 = await 가방읽기(request, 나);
    await verify('새 캐릭터 번호가 돌아온다', 나.캐릭터번호 > 0, true, {
      blocker: true,
    });
    await verify('캐릭터 골드가 0 이다', 지금.gold, 0, { blocker: true });
  });

  await test.step('상점에서 빨간 물약 하나를 산다', async () => {
    const 응답 = await 사기(request, 나, 'potion_hp_s', 1);
    await verify('골드가 0 인 캐릭터가 빨간 물약을 사면 「INSUFFICIENT_GOLD」로 막힌다', await 오류코드읽기(응답), 'INSUFFICIENT_GOLD');
  });
});
