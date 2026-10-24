import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정지우기, 바꾸기, 새캐릭터, 오류코드, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';
import { 상점사기 } from './helpers/world.helper.js';

const 빨간물약값 = 30;

export const spec = defineCase({
  tcId: 'ASH-FN-104',
  name: '골드 29 로 빨간 물약을 사려 하면 409 「INSUFFICIENT_GOLD」이고 골드가 29 그대로다',
  platforms: ['android'],
  precondition: ['골드가 29 인 새 캐릭터가 있다', '골드가 30 인 새 캐릭터가 있다'],
  techniques: ['경계값 분석'],
  elements: ['item:potion_hp_s', 'flow:골드-상점구매'],
  params: z.object({
    모자란골드: z.number().int().min(0).max(29).describe('빨간 물약을 살 수 없는 골드 — 0 이상 29 이하').default(29),
    맞는골드: z.number().int().min(30).max(100000).describe('빨간 물약을 살 수 있는 골드 — 30 이상').default(30),
  }),
  expected: null,
});

test(spec, async ({ admin, params }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('골드가 29 인 새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa104');
      await 바꾸기(admin, 나, { gold: params.모자란골드 });
    });

    await test.step('골드가 29 인 새 캐릭터가 있는지 확인한다', async () => {
      await verify('골드가 29 인 새 캐릭터가 있다', (await 캐릭터읽기(admin, 나!)).gold, params.모자란골드, { blocker: true });
    });

    await test.step('빨간 물약 1개를 산다', async () => {
      const 응답 = await 상점사기(admin, 나!, 'potion_hp_s', 1);
      const 코드 = await verify('응답 코드가 409 다', 응답.status(), 409);
      const 이름 = await verify('오류 코드가 「INSUFFICIENT_GOLD」이다', await 오류코드(응답), 'INSUFFICIENT_GOLD');
      const 골드 = await verify('골드가 29 그대로다', (await 캐릭터읽기(admin, 나!)).gold, params.모자란골드);
      await verify('골드 29 로 빨간 물약을 사려 하면 409 「INSUFFICIENT_GOLD」이고 골드가 29 그대로다', 코드 && 이름 && 골드, true);
    });

    await test.step('골드가 30 인 새 캐릭터로 만든다', async () => {
      await 바꾸기(admin, 나!, { gold: params.맞는골드 });
    });

    await test.step('골드가 30 인 새 캐릭터가 있는지 확인한다', async () => {
      await verify('골드가 30 인 새 캐릭터가 있다', (await 캐릭터읽기(admin, 나!)).gold, params.맞는골드, { blocker: true });
    });

    await test.step('골드가 30 일 때 빨간 물약 1개를 산다', async () => {
      const 응답 = await 상점사기(admin, 나!, 'potion_hp_s', 1);
      const 코드 = await verify('응답 코드가 200 이다', 응답.status(), 200);
      const 골드 = await verify('남은 골드가 0 이다', (await 캐릭터읽기(admin, 나!)).gold, params.맞는골드 - 빨간물약값);
      await verify('골드 30 으로 빨간 물약을 사면 골드가 0 이 된다', 코드 && 골드, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
