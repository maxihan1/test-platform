import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가방, 계정지우기, 바꾸기, 새캐릭터, 오류코드, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';
import { 상점사기 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-152',
  name: '골드 35 인 악명 캐릭터가 빨간 물약을 사려 하면 409 「INSUFFICIENT_GOLD」다',
  platforms: ['android'],
  precondition: ['성향치가 −1 인 악명 새 캐릭터의 골드가 35 다', '성향치가 −1 인 악명 새 캐릭터의 골드가 36 이다'],
  techniques: ['경계값 분석'],
  elements: ['item:potion_hp_s', 'state:성향=악명', 'flow:골드-상점구매'],
  params: z.object({
    모자란골드: z.number().int().min(0).max(35).describe('악명 캐릭터의 골드 — 0 이상 35 이하 (빨간 물약 값 36 에 모자란 금액)').default(35),
    딱맞는골드: z.number().int().min(36).max(100000).describe('악명 캐릭터의 골드 — 36 이상 100000 이하 (사고 남는 골드는 이 값에서 36 을 뺀 값)').default(36),
  }),
  expected: null,
});

test(spec, async ({ admin, params }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('성향치가 −1 인 악명 새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa152');
      await 바꾸기(admin, 나, { alignment: -1 });
    });

    await test.step('성향치가 −1 인지 확인한다', async () => {
      await verify('성향치가 −1 이다', (await 캐릭터읽기(admin, 나!)).alignment.value, -1, { blocker: true });
    });

    await test.step('빨간 물약 1개를 산다', async () => {
      await 바꾸기(admin, 나!, { gold: params.모자란골드 });
      await verify('골드가 35 다', (await 가방(admin, 나!)).gold, params.모자란골드, { blocker: true });
      const 응답 = await 상점사기(admin, 나!, 'potion_hp_s', 1);
      const 코드 = await verify('골드 35 로 산 응답 코드가 409 다', 응답.status(), 409);
      const 이름 = await verify('골드 35 로 산 오류 코드가 「INSUFFICIENT_GOLD」다', await 오류코드(응답), 'INSUFFICIENT_GOLD');
      await verify('골드 35 인 악명 캐릭터가 빨간 물약을 사려 하면 409 「INSUFFICIENT_GOLD」다', 코드 && 이름, true);

      await 바꾸기(admin, 나!, { gold: params.딱맞는골드 });
      await verify('골드가 36 이다', (await 가방(admin, 나!)).gold, params.딱맞는골드, { blocker: true });
      const 구매 = await verify('골드 36 으로 산 응답 코드가 200 이다', (await 상점사기(admin, 나!, 'potion_hp_s', 1)).status(), 200);
      const 남음 = await verify('남은 골드가 0 이다', (await 가방(admin, 나!)).gold, params.딱맞는골드 - 36);
      await verify('골드 36 인 악명 캐릭터가 빨간 물약을 사면 골드가 0 이 된다', 구매 && 남음, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
