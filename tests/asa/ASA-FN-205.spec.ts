import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 살아있는봇들 } from './helpers/combat.helper.js';
import { 시작물약팔기, 전리품나올때까지처치, 전리품이나왔나 } from './helpers/loot.helper.js';
import { 가방읽기, 가방채우기, 플레이어만들기, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-205',
  name: '가방이 다 찬 캐릭터가 봇 전리품을 얻으면 「droppedToGround」가 true 다',
  apiDoc: 1,
  precondition: ['가방 40칸이 다 찬 캐릭터가 있다'],
  params: z.object({
    시도상한: z.number().int().min(6).max(12).describe('전리품이 나올 때까지 봇을 처치해 볼 최대 횟수 — 6 이상 12 이하').default(6),
  }),
  expected: null,
});

test(spec, async ({ request, params }) => {
  let 나!: 플레이어;

  await test.step('일회용 계정으로 캐릭터를 만들고 시작 물약을 팔고 가방을 채운다', async () => {
    나 = await 플레이어만들기(request);
    await 시작물약팔기(request, 나);
    await 가방채우기(request, 나);
  });

  await test.step('가방 40칸이 다 찬 캐릭터와 소지품이 있는 봇을 확인한다', async () => {
    const 가방 = await 가방읽기(request, 나);
    const 후보 = await 살아있는봇들(request, 나, (b) => b.itemCount > 0);
    await verify('가방 사용 칸이 40 이다', 가방.used, 40, { blocker: true });
    await verify('살아 있고 소지품이 있는 봇이 있다', 후보.length > 0, true, {
      blocker: true,
    });
  });

  await test.step('전리품이 나올 때까지 봇 처치를 알린다', async () => {
    const 결과 = await 전리품나올때까지처치(request, 나, (b) => b.itemCount > 0, params.시도상한);
    await verify('봇 처치에서 전리품이 나온다', 전리품이나왔나(결과.응답본문), true, { blocker: true });
    await verify('가방이 다 찬 캐릭터가 봇 전리품을 얻으면 「droppedToGround」가 true 다', 결과.응답본문?.droppedToGround, true);
  });
});
