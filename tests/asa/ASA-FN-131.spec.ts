import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { GM레벨, 캐릭터읽기, 플레이어만들기, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-131',
  name: '50레벨로 올리면 레벨이 50 이다',
  apiDoc: 2,
  techniques: ['경계값 분석'],
  precondition: ['1레벨 캐릭터가 있다'],
  params: z.object({
    넘는레벨: z.number().int().describe('올려 볼 최대 레벨보다 높은 레벨 — 51 이상').default(51),
  }),
  expected: null,
});

test(spec, async ({ request, params }) => {
  let 나!: 플레이어;

  await test.step('일회용 계정으로 캐릭터를 만든다', async () => {
    나 = await 플레이어만들기(request);
  });

  await test.step('1레벨 캐릭터가 있는지 확인한다', async () => {
    await verify('캐릭터 번호가 돌아온다', 나.캐릭터번호 > 0, true, {
      blocker: true,
    });
    await verify('캐릭터가 1레벨이다', (await 캐릭터읽기(request, 나)).level, 1, { blocker: true });
  });

  await test.step('GM 으로 50레벨로 올린다', async () => {
    await GM레벨(request, 나, 50);
    await verify('50레벨로 올리면 레벨이 50 이다', (await 캐릭터읽기(request, 나)).level, 50);
  });

  await test.step('GM 으로 51레벨로 올린다', async () => {
    await GM레벨(request, 나, params.넘는레벨);
    await verify('51레벨로 올리면 레벨이 50 을 넘지 않는다', (await 캐릭터읽기(request, 나)).level <= 50, true);
  });
});
