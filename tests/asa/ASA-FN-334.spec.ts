import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 살아있는봇들 } from './helpers/combat.helper.js';
import { 전리품나올때까지처치, 전리품이나왔나, 템플릿수량 } from './helpers/loot.helper.js';
import { 가방읽기, 플레이어만들기, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-334',
  name: '봇 처치에서 전리품이 나오면 그 아이템이 내 가방에 있다',
  apiDoc: 1,
  precondition: ['캐릭터와 소지품이 있는 봇이 있다'],
  params: z.object({
    시도상한: z.number().int().min(6).max(12).describe('전리품이 나올 때까지 봇을 처치해 볼 최대 횟수 — 6 이상 12 이하').default(6),
  }),
  expected: null,
});

test(spec, async ({ request, params }) => {
  let 나!: 플레이어;

  await test.step('일회용 계정으로 캐릭터를 만든다', async () => {
    나 = await 플레이어만들기(request);
  });

  await test.step('캐릭터와 소지품이 있는 봇을 확인한다', async () => {
    const 후보 = await 살아있는봇들(request, 나, (b) => b.itemCount > 0);
    await verify('캐릭터 번호가 돌아온다', 나.캐릭터번호 > 0, true, {
      blocker: true,
    });
    await verify('살아 있고 소지품이 있는 봇이 있다', 후보.length > 0, true, {
      blocker: true,
    });
  });

  await test.step('전리품이 나올 때까지 봇 처치를 알린다', async () => {
    const 전 = await 가방읽기(request, 나);
    const 결과 = await 전리품나올때까지처치(request, 나, (b) => b.itemCount > 0, params.시도상한);
    await verify('봇 처치에서 전리품이 나온다', 전리품이나왔나(결과.응답본문), true, { blocker: true });
    const 얻음 = 결과.응답본문?.dropped;
    if (얻음 === undefined || 얻음 === null) return;
    const 후 = await 가방읽기(request, 나);
    const 늘어난수량 = 템플릿수량(후, 얻음.templateId) - 템플릿수량(전, 얻음.templateId);
    await verify('봇 처치에서 전리품이 나오면 그 아이템이 내 가방에 있다', 늘어난수량 > 0, true);
  });
});
