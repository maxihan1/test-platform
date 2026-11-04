import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 떨어뜨릴때까지죽기 } from './helpers/combat.helper.js';
import { 초뒤인가 } from './helpers/loot.helper.js';
import { GM성향, 캐릭터읽기, 플레이어만들기, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-319',
  name: '죽어 떨어뜨린 아이템의 「expiresAt」이 180초 뒤다',
  apiDoc: 1,
  precondition: ['성향치 −650 캐릭터가 있다'],
  params: z.object({
    오차초: z.number().min(2).max(30).describe('만료 시각이 180초에서 벌어져도 괜찮은 폭(초) — 2 이상 30 이하').default(5),
  }),
  expected: null,
});

test(spec, async ({ request, params }) => {
  let 나!: 플레이어;

  await test.step('일회용 계정으로 캐릭터를 만들고 성향치를 −650 으로 낮춘다', async () => {
    나 = await 플레이어만들기(request);
    await GM성향(request, 나, -650);
  });

  await test.step('성향치 −650 캐릭터를 확인한다', async () => {
    const 지금 = await 캐릭터읽기(request, 나);
    await verify('캐릭터 성향치가 −650 이다', 지금.alignment.value, -650, {
      blocker: true,
    });
  });

  await test.step('아이템을 떨어뜨릴 때까지 사망을 알린다', async () => {
    const 결과 = await 떨어뜨릴때까지죽기(request, 나);
    const 떨군 = 결과.응답본문?.dropped;
    await verify('사망 드랍 아이템이 돌아온다', 떨군 !== undefined && 떨군 !== null, true, { blocker: true });
    await verify('죽어 떨어뜨린 아이템의 「expiresAt」이 180초 뒤다', 초뒤인가(떨군?.expiresAt, 결과.알린시각, 180, params.오차초), true);
  });
});
