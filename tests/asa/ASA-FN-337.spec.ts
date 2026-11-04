import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 살아있는봇들 } from './helpers/combat.helper.js';
import { 봇들처치해보기, 초뒤인가 } from './helpers/loot.helper.js';
import { 플레이어만들기, type 봇, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-337',
  name: '봇을 처치하면 「respawnAt」이 60초 뒤다',
  apiDoc: 2,
  precondition: ['캐릭터와 살아 있는 봇이 있다'],
  params: z.object({
    오차초: z.number().min(2).max(30).describe('부활 시각이 60초에서 벌어져도 괜찮은 폭(초) — 2 이상 30 이하').default(5),
  }),
  expected: null,
});

test(spec, async ({ request, params }) => {
  let 나!: 플레이어;
  let 후보: 봇[] = [];

  await test.step('일회용 계정으로 캐릭터를 만들고 살아 있는 봇을 고른다', async () => {
    나 = await 플레이어만들기(request);
    후보 = await 살아있는봇들(request, 나);
  });

  await test.step('캐릭터와 살아 있는 봇을 확인한다', async () => {
    await verify('캐릭터 번호가 돌아온다', 나.캐릭터번호 > 0, true, {
      blocker: true,
    });
    await verify('살아 있는 봇이 있다', 후보.length > 0, true, {
      blocker: true,
    });
  });

  await test.step('그 봇 처치를 알린다', async () => {
    const 결과 = await 봇들처치해보기(request, 나, 후보);
    await verify('봇 처치가 받아들여진다', 결과.응답본문 !== undefined, true, {
      blocker: true,
    });
    await verify('봇을 처치하면 「respawnAt」이 60초 뒤다', 초뒤인가(결과.응답본문?.bot.respawnAt, 결과.알린시각, 60, params.오차초), true);
  });
});
