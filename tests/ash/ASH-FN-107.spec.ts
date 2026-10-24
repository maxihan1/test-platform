import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정지우기, 바꾸기, 새캐릭터, 오류코드, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';
import { 상점사기 } from './helpers/world.helper.js';

const 짧은검값 = 300;

export const spec = defineCase({
  tcId: 'ASH-FN-107',
  name: '골드 299 로 짧은 검을 사려 하면 409 「INSUFFICIENT_GOLD」이고 골드가 299 그대로다',
  platforms: ['android'],
  precondition: ['골드가 299 인 새 캐릭터가 있다', '골드가 300 인 새 캐릭터가 있다'],
  techniques: ['경계값 분석'],
  elements: ['item:sword_short', 'flow:골드-상점구매'],
  params: z.object({
    모자란골드: z.number().int().min(0).max(299).describe('짧은 검을 살 수 없는 골드 — 0 이상 299 이하').default(299),
    맞는골드: z.number().int().min(300).max(100000).describe('짧은 검을 살 수 있는 골드 — 300 이상').default(300),
  }),
  expected: null,
});

test(spec, async ({ admin, params }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('골드가 299 인 새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa107');
      await 바꾸기(admin, 나, { gold: params.모자란골드 });
    });

    await test.step('골드가 299 인 새 캐릭터가 있는지 확인한다', async () => {
      await verify('골드가 299 인 새 캐릭터가 있다', (await 캐릭터읽기(admin, 나!)).gold, params.모자란골드, { blocker: true });
    });

    await test.step('짧은 검 1개를 산다', async () => {
      const 응답 = await 상점사기(admin, 나!, 'sword_short', 1);
      const 코드 = await verify('응답 코드가 409 다', 응답.status(), 409);
      const 이름 = await verify('오류 코드가 「INSUFFICIENT_GOLD」이다', await 오류코드(응답), 'INSUFFICIENT_GOLD');
      const 골드 = await verify('골드가 299 그대로다', (await 캐릭터읽기(admin, 나!)).gold, params.모자란골드);
      await verify('골드 299 로 짧은 검을 사려 하면 409 「INSUFFICIENT_GOLD」이고 골드가 299 그대로다', 코드 && 이름 && 골드, true);
    });

    await test.step('골드가 300 인 새 캐릭터로 만든다', async () => {
      await 바꾸기(admin, 나!, { gold: params.맞는골드 });
    });

    await test.step('골드가 300 인 새 캐릭터가 있는지 확인한다', async () => {
      await verify('골드가 300 인 새 캐릭터가 있다', (await 캐릭터읽기(admin, 나!)).gold, params.맞는골드, { blocker: true });
    });

    await test.step('골드가 300 일 때 짧은 검 1개를 산다', async () => {
      const 응답 = await 상점사기(admin, 나!, 'sword_short', 1);
      const 코드 = await verify('응답 코드가 200 이다', 응답.status(), 200);
      const 골드 = await verify('남은 골드가 0 이다', (await 캐릭터읽기(admin, 나!)).gold, params.맞는골드 - 짧은검값);
      await verify('골드 300 으로 짧은 검을 사면 골드가 0 이 된다', 코드 && 골드, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
