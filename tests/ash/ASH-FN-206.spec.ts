import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import {
  강화되풀이,
  강화확률되돌리기,
  강화확률바꾸기,
  계정지우기,
  고정비우기,
  새캐릭터,
  어드민설정,
  type 강화확률,
  type 캐릭터,
} from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-206',
  name: '목표 +9 성공 확률을 100% 로 바꾸고 강화하면 모두 성공한다',
  platforms: ['android'],
  precondition: ['+8 롱 소드와 무기 강화 주문서를 가진 새 캐릭터가 있다'],
  techniques: ['경계값 분석'],
  elements: ['item:sword_long', 'item:scroll_weapon', 'rate:enhance_9'],
  params: z.object({
    횟수: z.number().int().min(1).describe('확률마다 강화할 횟수 — 1 이상').default(5),
  }),
  expected: null,
});

test(spec, async ({ admin, params }) => {
  let 나: 캐릭터 | undefined;
  let 기본: 강화확률[] = [];
  const 바꾼표 = (줄: 강화확률): 강화확률[] => 기본.map((x) => (x.targetLevel === 9 ? 줄 : x));
  try {
    await test.step('새 캐릭터를 만들고 강화 확률표를 기본 표로 되돌린다', async () => {
      나 = await 새캐릭터(admin, 'zqa206');
      await 고정비우기(admin);
      await 강화확률되돌리기(admin);
    });

    await test.step('목표 +9 강화 확률 줄이 설정에 있는지 확인한다', async () => {
      기본 = (await 어드민설정(admin)).enhance.rates;
      await verify('설정에 목표 +9 강화 확률 줄이 있다', 기본.some((x) => x.targetLevel === 9), true, { blocker: true });
    });

    await test.step('목표 +9 성공 확률을 100% 로 바꾸고 정해 둔 횟수만큼 강화한다', async () => {
      await 강화확률바꾸기(admin, 바꾼표({ targetLevel: 9, success: 1, fail: 0, destroy: 0 }));
      const 셈 = await 강화되풀이(admin, 나!, 'sword_long', 9, params.횟수);
      await verify('목표 +9 성공 확률을 100% 로 바꾸고 강화하면 모두 성공한다', 셈.성공, params.횟수);
    });

    await test.step('목표 +9 성공 확률을 0% 로 바꾸고 정해 둔 횟수만큼 강화한다', async () => {
      await 강화확률바꾸기(admin, 바꾼표({ targetLevel: 9, success: 0, fail: 1, destroy: 0 }));
      const 셈 = await 강화되풀이(admin, 나!, 'sword_long', 9, params.횟수);
      await verify('목표 +9 성공 확률을 0% 로 바꾸고 강화하면 한 번도 성공하지 않는다', 셈.성공, 0);
    });
  } finally {
    await 강화확률되돌리기(admin);
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
