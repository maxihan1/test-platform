import { defineCase, test, verify } from '@platform/kit';

import { 떨어뜨릴때까지죽기, 줍기 } from './helpers/combat.helper.js';
import {
  가방읽기,
  가방채우기,
  GM성향,
  사기,
  오류코드읽기,
  템플릿찾기,
  팔기,
  플레이어만들기,
  type 바닥아이템,
  type 플레이어,
} from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-204',
  name: '가방이 다 찬 캐릭터가 상점에서 사면 「INVENTORY_FULL」로 막힌다',
  apiDoc: 1,
  precondition: ['가방 40칸이 다 찬 캐릭터가 있다', '가방 40칸이 다 찬 캐릭터 곁에 바닥 아이템이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 나!: 플레이어;
  let 떨군이!: 플레이어;
  let 바닥: 바닥아이템 | undefined;
  let 골드 = -1;

  await test.step('일회용 계정으로 가방 40칸이 다 찬 캐릭터를 만든다', async () => {
    나 = await 플레이어만들기(request);
    await 가방채우기(request, 나);
  });

  await test.step('가방 40칸이 다 찬 캐릭터를 확인한다', async () => {
    const 지금 = await 가방읽기(request, 나);
    골드 = 지금.gold;
    await verify('새 캐릭터 번호가 돌아온다', 나.캐릭터번호 > 0, true, {
      blocker: true,
    });
    await verify('가방이 40칸 다 찼다', 지금.used, 40, { blocker: true });
  });

  await test.step('다른 일회용 캐릭터가 장비를 바닥에 떨어뜨리게 한다', async () => {
    떨군이 = await 플레이어만들기(request);
    const 물약 = 템플릿찾기(await 가방읽기(request, 떨군이), 'potion_hp_s');
    if (물약 !== undefined) await 팔기(request, 떨군이, 물약.id, 물약.quantity);
    await GM성향(request, 떨군이, -650);
    바닥 = (await 떨어뜨릴때까지죽기(request, 떨군이)).응답본문?.dropped ?? undefined;
  });

  await test.step('가방이 다 찬 캐릭터 곁에 바닥 아이템이 있는지 확인한다', async () => {
    await verify('바닥 아이템이 떨어졌다', 바닥 !== undefined, true, {
      blocker: true,
    });
  });

  await test.step('상점에서 짧은 검 하나를 산다', async () => {
    const 응답 = await 사기(request, 나, 'sword_short', 1);
    await verify('가방이 다 찬 캐릭터가 상점에서 사면 「INVENTORY_FULL」로 막힌다', await 오류코드읽기(응답), 'INVENTORY_FULL');
    const 지금 = await 가방읽기(request, 나);
    await verify('가방이 다 찬 캐릭터가 상점에서 사려 하면 골드가 그대로다', 지금.gold, 골드);
  });

  await test.step('그 바닥 아이템을 줍는다', async () => {
    if (바닥 === undefined) return;
    const 응답 = await 줍기(request, 나, 바닥.id, { x: 바닥.x, z: 바닥.z });
    await verify('가방이 다 찬 캐릭터가 바닥 아이템을 주우면 「INVENTORY_FULL」로 막힌다', await 오류코드읽기(응답), 'INVENTORY_FULL');
  });
});
