import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정지우기, 고정비우기, 드랍확률되돌리기, 바꾸기, 사망되풀이, 새캐릭터, 순간이동, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-256',
  name: '성향치 −400 인 캐릭터가 정해 둔 횟수만큼 사망하면 아이템이 떨어지는 비율이 50% 와 허용 오차 안에서 같다',
  platforms: ['android'],
  precondition: ['성향치 −400 인 새 캐릭터가 빨간 물약을 가지고 있다'],
  elements: ['drop:death_-300~-599', 'item:potion_hp_s', 'state:생존=죽음'],
  params: z.object({
    횟수: z.number().int().min(1).describe('사망 보고 횟수 — 많을수록 비율이 확률에 가깝다').default(1000),
  }),
  expected: z.object({
    허용오차: z.number().min(0.001).max(0.999).describe('떨어지는 비율 허용 오차 — 0 과 1 사이').default(0.05),
  }),
});

test(spec, async ({ admin, params, expected }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('성향치 −400 인 새 캐릭터를 만들고 드랍 설정을 기본으로 되돌린다', async () => {
      나 = await 새캐릭터(admin, 'zqa256');
      await 고정비우기(admin);
      await 드랍확률되돌리기(admin);
      await 순간이동(admin, 나, 'Beginner');
      await 바꾸기(admin, 나, { alignment: -400 });
    });

    await test.step('캐릭터 성향치를 확인한다', async () => {
      const 지금 = await 캐릭터읽기(admin, 나!);
      await verify('캐릭터 성향치가 −400 이다', 지금.alignment.value, -400, { blocker: true });
    });

    await test.step('정해 둔 횟수만큼 사망을 보고한다', async () => {
      const 셈 = await 사망되풀이(admin, 나!, params.횟수);
      const 맞음 = await verify.rates('떨어짐 · 안 떨어짐 비율이 기대 확률 ± 허용 오차 안이다', 셈, { 떨어짐: 0.5, 안떨어짐: 0.5 }, expected.허용오차);
      await verify('성향치 −400 인 캐릭터가 정해 둔 횟수만큼 사망하면 아이템이 떨어지는 비율이 50% 와 허용 오차 안에서 같다', 맞음, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
