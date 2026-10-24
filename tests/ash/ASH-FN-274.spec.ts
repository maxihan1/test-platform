import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { type 캐릭터 } from './helpers/api.helper.js';
import { 결과고정비우기, 드랍확률되돌리기, 캐릭터읽기 } from './helpers/game-state.helper.js';
import { 모두지우기, 선량봇처치들, 일꾼들만들기, 전리품수 } from './helpers/loot.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-274',
  name: '선량한 봇을 1,000번 처치하면 50% 에 가깝게 전리품을 얻는다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 초록 들판에 있다'],
  elements: ['zone:Beginner', 'drop:bot_loot'],
  params: z.object({
    시도: z.number().int().describe('시도 횟수 — 100 이상').default(1000),
    허용오차: z.number().describe('결과마다 허용하는 비율 차이 — 0 과 1 사이').default(0.05),
  }),
  expected: null,
});

test(spec, async ({ admin, request, params }) => {
  const 일꾼들: 캐릭터[] = [];
  try {
    await test.step('새 전사 캐릭터들을 초록 들판에 만든다', async () => {
      await 결과고정비우기(admin);
      await 드랍확률되돌리기(admin);
      await 일꾼들만들기(admin, 'qafn274', 10, 0, 일꾼들);
    });
    await test.step('캐릭터들이 초록 들판에 있는지 확인한다', async () => {
      const 정보 = await 캐릭터읽기(admin, 일꾼들[0]);
      await verify('캐릭터가 초록 들판에 있다', 정보.zone, 'Beginner', { blocker: true });
    });
    await test.step('선량한 봇 처치를 1,000번 보고한다', async () => {
      const 얻음 = 전리품수((await 선량봇처치들(request, admin, 일꾼들, params.시도)).결과들);
      const 분포 = await verify.rates('전리품을 얻은 비율이 50% 에 가깝다', { 얻음: 얻음, 못얻음: params.시도 - 얻음 }, { 얻음: 0.5, 못얻음: 0.5 }, params.허용오차);
      await verify('선량한 봇을 1,000번 처치하면 50% 에 가깝게 전리품을 얻는다', 분포, true);
    });
  } finally {
    await 모두지우기(admin, 일꾼들);
    await 결과고정비우기(admin);
  }
});
