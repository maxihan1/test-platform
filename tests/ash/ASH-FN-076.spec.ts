import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정지우기, 몬스터처치, 새캐릭터, 응답몸, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';
import { 스폰들 } from './helpers/world.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-076',
  name: '임프를 스무 번 처치하면 얻은 골드가 모두 8 이상 15 이하다',
  platforms: ['android'],
  precondition: ['새 캐릭터가 있다'],
  elements: ['monster:Imp', 'flow:골드-몬스터처치'],
  params: z.object({
    횟수: z.number().int().min(1).max(24).describe('처치를 보고할 서로 다른 임프 스폰 수 — 1 이상 24 이하').default(20),
  }),
  expected: null,
});

test(spec, async ({ admin, params }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa076');
    });

    await test.step('새 캐릭터가 있고 임프 스폰이 충분한지 확인한다', async () => {
      const 있음 = await verify('새 캐릭터가 있다', (await 캐릭터읽기(admin, 나!)).name, 나!.이름, { blocker: true });
      const 충분 = await verify('서로 다른 임프 스폰이 처치할 횟수만큼 있다', (await 스폰들(admin, 'Beginner', 'Imp')).length >= params.횟수, true, { blocker: true });
      await verify('새 캐릭터가 있고 임프 스폰이 충분하다', 있음 && 충분, true, { blocker: true });
    });

    await test.step('서로 다른 임프 스폰 20곳에서 처치를 보고한다', async () => {
      const 어긋남: string[] = [];
      let 처치수 = 0;
      for (const 스폰 of (await 스폰들(admin, 'Beginner', 'Imp')).slice(0, params.횟수)) {
        const 응답 = await 몬스터처치(admin, 나!, 스폰);
        if (응답.status() !== 200) {
          어긋남.push(`${스폰.id}: 응답 ${String(응답.status())}`);
          continue;
        }
        처치수 += 1;
        const 골드 = (await 응답몸<{ goldGained: number }>(응답)).goldGained;
        if (!(골드 >= 8 && 골드 <= 15)) 어긋남.push(`${스폰.id}: 골드 ${String(골드)}`);
      }
      const 다함 = await verify('정해 둔 횟수만큼 처치된다', 처치수, params.횟수);
      const 범위 = await verify('8 이상 15 이하를 벗어난 골드가 없다', 어긋남.join(', '), '');
      await verify('임프를 스무 번 처치하면 얻은 골드가 모두 8 이상 15 이하다', 다함 && 범위, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
