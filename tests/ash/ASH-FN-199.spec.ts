import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 강화되풀이, 강화확률되돌리기, 계정지우기, 고정비우기, 새캐릭터, 어드민설정, type 캐릭터 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-199',
  name: '목표 +7 강화를 정해 둔 횟수만큼 시도하면 성공 · 실패 · 파괴 비율이 40% · 35% · 25% 와 허용 오차 안에서 같다',
  platforms: ['android'],
  precondition: ['+6 롱 소드와 무기 강화 주문서를 넉넉히 가진 새 캐릭터가 있다'],
  elements: ['item:sword_long', 'item:scroll_weapon', 'rate:enhance_7'],
  params: z.object({
    횟수: z.number().int().min(1).describe('강화 시도 횟수 — 많을수록 비율이 확률에 가깝다').default(1000),
  }),
  expected: z.object({
    허용오차: z.number().min(0.001).max(0.999).describe('결과마다 비율 허용 오차 — 0 과 1 사이').default(0.05),
  }),
});

test(spec, async ({ admin, params, expected }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('새 캐릭터를 만들고 강화 확률표를 기본 표로 되돌린다', async () => {
      나 = await 새캐릭터(admin, 'zqa199');
      await 고정비우기(admin);
      await 강화확률되돌리기(admin);
    });

    await test.step('목표 +7 강화 확률이 기본 표인지 확인한다', async () => {
      const 줄 = (await 어드민설정(admin)).enhance.rates.find((x) => x.targetLevel === 7);
      await verify('설정의 목표 +7 성공 확률이 40% 다', 줄?.success, 0.4, { blocker: true });
    });

    await test.step('목표 +7 강화를 정해 둔 횟수만큼 시도한다', async () => {
      const 셈 = await 강화되풀이(admin, 나!, 'sword_long', 7, params.횟수);
      const 맞음 = await verify.rates('성공 · 실패 · 파괴 비율이 결과마다 기대 확률 ± 허용 오차 안이다', 셈, { 성공: 0.4, 실패: 0.35, 파괴: 0.25 }, expected.허용오차);
      await verify('목표 +7 강화를 정해 둔 횟수만큼 시도하면 성공 · 실패 · 파괴 비율이 40% · 35% · 25% 와 허용 오차 안에서 같다', 맞음, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
