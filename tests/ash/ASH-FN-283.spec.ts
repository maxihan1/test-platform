import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 본문, type 봇, type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 구역자리, 살아있는봇, 새캐릭터, 순간이동, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { type 봇처치결과, 봇처치보내기, 서버시각 } from './helpers/world.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-283',
  name: '봇을 처치하면 그 봇의 부활 시각이 처치 때부터 60초 뒤다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 초록 들판에 있다'],
  elements: ['state:성향=선량', 'zone:Beginner'],
  params: z.object({
    허용오차: z.number().describe('60초와의 허용 차이(초) — 0 이상 5 이하').default(2),
  }),
  expected: null,
});

test(spec, async ({ admin, request, params }) => {
  let 누구: 캐릭터 | undefined;
  let 선량한봇: 봇 | undefined;
  try {
    await test.step('새 전사 캐릭터를 초록 들판으로 보내고 선량한 봇을 고른다', async () => {
      누구 = await 새캐릭터(admin, 'qafn283');
      await 순간이동(admin, 누구, 'Beginner');
      선량한봇 = await 살아있는봇(admin, 누구, 'Beginner', 'Innocent');
    });
    await test.step('새 전사 캐릭터가 초록 들판에 있는지 확인한다', async () => {
      await verify('새 전사 캐릭터가 초록 들판에 있다', (await 캐릭터정보받기(request, 누구!)).zone, 'Beginner', { blocker: true });
    });
    await test.step('선량한 봇 처치를 보고한다', async () => {
      const 응답 = await 봇처치보내기(request, 누구!, 선량한봇!.id, 구역자리.Beginner);
      const 결과 = await 본문<봇처치결과>(응답, '봇 처치');
      const 부활 = 결과.bot.respawnAt;
      const 차이초 = 부활 === null ? undefined : (Date.parse(부활) - 서버시각(응답)) / 1000;
      const 정해짐 = await verify('봇의 부활 시각이 정해진다', 부활 !== null, true);
      const 가깝다 = await verify('부활 시각이 처치 때부터 60초와 허용 차이 안이다', 차이초 !== undefined && Math.abs(차이초 - 60) <= params.허용오차, true);
      await verify('봇을 처치하면 그 봇의 부활 시각이 처치 때부터 60초 뒤다', 정해짐 && 가깝다, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
