import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 본문, type 봇, type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 살아있는봇, 새캐릭터, 순간이동, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { type 선공결과, 캐릭터정보와시각, PK공격 } from './helpers/pk.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-229',
  name: '선량한 봇을 먼저 공격하면 attackerBecamePurple 이 true 다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 초록 들판에 있다'],
  elements: ['zone:Beginner', 'state:성향=보라', 'move:성향 선량→보라'],
  params: z.object({
    오차초: z.number().describe('만료 시각이 기준에서 벗어나도 되는 초 — 0 이상').default(5),
  }),
  expected: null,
});

test(spec, async ({ admin, request, params }) => {
  let 가해: 캐릭터 | undefined;
  let 대상: 봇 | undefined;
  try {
    await test.step('새 전사 캐릭터를 초록 들판에 만든다', async () => {
      const 가 = await 새캐릭터(admin, 'qafn229');
      가해 = 가;
      await 순간이동(admin, 가, 'Beginner');
      대상 = await 살아있는봇(admin, 가, 'Beginner', 'Innocent');
    });
    await test.step('캐릭터가 초록 들판에 있고 선량한 봇이 있는지 확인한다', async () => {
      const 정보 = await 캐릭터정보받기(request, 가해!);
      await verify('공격하는 캐릭터가 초록 들판에 있다', 정보.zone, 'Beginner', { blocker: true });
      await verify('공격받을 봇이 선량하다', 대상?.alignment.state, 'Innocent', { blocker: true });
    });
    await test.step('선량한 봇을 먼저 공격한다', async () => {
      const 결과 = await 본문<선공결과>(await PK공격(request, 가해!, 대상!), '선공');
      await verify('선량한 봇을 먼저 공격하면 attackerBecamePurple 이 true 다', 결과.attackerBecamePurple, true);
    });
    await test.step('선량한 봇을 먼저 공격하고 만료 시각을 읽는다', async () => {
      const { 정보, 지금 } = await 캐릭터정보와시각(request, 가해!);
      const 남은초 = (Date.parse(정보.alignment.purpleUntil ?? '') - 지금) / 1000;
      await verify('선량한 봇을 먼저 공격하면 보라 이름이 60초 뒤에 끝난다', Math.abs(남은초 - 60) <= params.오차초, true);
    });
  } finally {
    if (가해 !== undefined) await 캐릭터지우기(admin, 가해);
  }
});
