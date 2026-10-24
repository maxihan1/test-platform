import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { type 캐릭터 } from './helpers/api.helper.js';
import { 결과고정비우기, 드랍확률되돌리기, 캐릭터읽기 } from './helpers/game-state.helper.js';
import { 모두지우기, 일꾼들만들기, 일꾼들죽어서떨군수 } from './helpers/loot.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-250',
  name: '성향치 0 캐릭터가 1,000번 죽으면 5% 에 가깝게 아이템을 떨어뜨린다',
  platforms: ['android'],
  precondition: ['성향치 0 인 새 전사 캐릭터가 초록 들판에 있다'],
  elements: ['zone:Beginner', 'drop:death_0이상', 'state:생존=죽음'],
  params: z.object({
    시도: z.number().int().describe('시도 횟수 — 100 이상').default(1000),
    허용오차: z.number().describe('결과마다 허용하는 비율 차이 — 0 과 1 사이').default(0.03),
  }),
  expected: null,
});

test(spec, async ({ admin, request, params }) => {
  const 일꾼들: 캐릭터[] = [];
  try {
    await test.step('성향치 0 인 새 전사 캐릭터들을 초록 들판에 만든다', async () => {
      await 결과고정비우기(admin);
      await 드랍확률되돌리기(admin);
      await 일꾼들만들기(admin, 'qafn250', 10, 0, 일꾼들);
    });
    await test.step('캐릭터들이 성향치 0 으로 초록 들판에 있는지 확인한다', async () => {
      const 정보 = await 캐릭터읽기(admin, 일꾼들[0]);
      await verify('캐릭터가 초록 들판에 있다', 정보.zone, 'Beginner', { blocker: true });
      await verify('캐릭터의 성향치가 0 이다', 정보.alignment.value, 0, { blocker: true });
    });
    await test.step('몬스터에게 죽었다고 1,000번 보고한다', async () => {
      const 떨군 = await 일꾼들죽어서떨군수(request, admin, 일꾼들, params.시도);
      const 분포 = await verify.rates('떨어뜨린 비율이 5% 에 가깝다', { 떨어뜨림: 떨군, 안떨어뜨림: params.시도 - 떨군 }, { 떨어뜨림: 0.05, 안떨어뜨림: 0.95 }, params.허용오차);
      await verify('성향치 0 캐릭터가 1,000번 죽으면 5% 에 가깝게 아이템을 떨어뜨린다', 분포, true);
    });
  } finally {
    await 모두지우기(admin, 일꾼들);
  }
});
