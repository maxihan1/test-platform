import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import {
  결과고정,
  계정지우기,
  고정비우기,
  드랍확률되돌리기,
  봇처치,
  산봇들,
  새캐릭터,
  순간이동,
  월드다시두기,
  응답몸,
  캐릭터읽기,
  type 봇처치응답,
  type 캐릭터,
} from './helpers/game-state.helper.js';
import { 봇찾기, 산봇하나 } from './helpers/bot-auth.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-282',
  name: '선량한 봇을 전리품 고정으로 처치하면 얻은 전리품이 그 봇의 장착 장비가 아니다',
  platforms: ['android'],
  precondition: ['새 캐릭터가 초록 들판에 있고 봇이 다시 시드돼 있다'],
  techniques: ['상태 전이'],
  elements: ['zone:Beginner', 'drop:bot_loot', 'state:성향=선량'],
  params: z.object({
    횟수: z.number().int().min(1).describe('처치할 선량한 봇 수 — 1 이상').default(10),
  }),
  expected: null,
});

test(spec, async ({ admin, params }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('새 캐릭터를 초록 들판에 두고 봇을 다시 시드한다', async () => {
      나 = await 새캐릭터(admin, 'zqa282');
      await 순간이동(admin, 나, 'Beginner');
      await 고정비우기(admin);
      await 드랍확률되돌리기(admin);
      await 월드다시두기(admin, 'Beginner');
    });

    await test.step('캐릭터와 봇이 초록 들판에 있는지 확인한다', async () => {
      await verify('새 캐릭터가 초록 들판에 있다', (await 캐릭터읽기(admin, 나!)).zone, 'Beginner', { blocker: true });
      await verify('초록 들판에 살아 있는 선량한 봇이 있다', (await 산봇들(admin, 나!, 'Beginner', 'Innocent')).length > 0, true, { blocker: true });
    });

    await test.step('봇 전리품을 얻음으로 고정하고 선량한 봇 열 명을 처치한다', async () => {
      await 결과고정(admin, { botLoot: Array.from({ length: params.횟수 }, () => true) });
      const 처치실패: string[] = [];
      const 어긋남: string[] = [];
      let 얻음 = 0;
      for (let i = 0; i < params.횟수; i += 1) {
        const 봇 = await 산봇하나(admin, 나!, 'Beginner', 'Innocent');
        const 장비앞 = 봇.equipment.map((x) => x.id).sort((a, b) => a - b);
        const 응답 = await 봇처치(admin, 나!, 봇.id);
        if (응답.status() !== 200) {
          처치실패.push(`${봇.name}: ${String(응답.status())}`);
          continue;
        }
        const 몸 = await 응답몸<봇처치응답>(응답);
        const 장비뒤 = ((await 봇찾기(admin, 나!, 봇.id))?.equipment ?? []).map((x) => x.id).sort((a, b) => a - b);
        if (몸.dropped !== null) 얻음 += 1;
        if (몸.dropped !== null && 장비앞.includes(몸.dropped.id)) 어긋남.push(`${봇.name}: 전리품이 장착 장비 ${String(몸.dropped.id)}`);
        if (장비앞.join(',') !== 장비뒤.join(',')) 어긋남.push(`${봇.name}: 장착 장비가 바뀜`);
      }
      const 처치 = await verify('선량한 봇 처치 응답이 모두 200 이다', 처치실패.join(', '), '');
      const 얻은것 = await verify('전리품을 얻은 처치가 있다', 얻음 > 0, true);
      const 장비아님 = await verify('얻은 전리품이 봇의 장착 장비가 아니다', 어긋남.join(', '), '');
      await verify('선량한 봇을 전리품 고정으로 처치하면 얻은 전리품이 그 봇의 장착 장비가 아니다', 처치 && 얻은것 && 장비아님, true);
    });
  } finally {
    await 고정비우기(admin);
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
