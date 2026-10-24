import { defineCase, test, verify } from '@platform/kit';

import { type 봇, type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 구역자리, 봇목록, 살아있는봇, 새캐릭터, 순간이동, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 봇처치 } from './helpers/world.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-285',
  name: '봇을 처치한 직후 봇 목록에서 그 봇은 죽은 채다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 초록 들판에 있다'],
  techniques: ['상태 전이'],
  elements: ['zone:Beginner'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  let 고른봇: 봇 | undefined;
  try {
    await test.step('새 전사 캐릭터를 초록 들판으로 보내고 봇을 고른다', async () => {
      누구 = await 새캐릭터(admin, 'qafn285');
      await 순간이동(admin, 누구, 'Beginner');
      고른봇 = await 살아있는봇(admin, 누구, 'Beginner');
    });
    await test.step('새 전사 캐릭터가 초록 들판에 있는지 확인한다', async () => {
      await verify('새 전사 캐릭터가 초록 들판에 있다', (await 캐릭터정보받기(request, 누구!)).zone, 'Beginner', { blocker: true });
    });
    await test.step('봇을 처치하고 바로 봇 목록을 받는다', async () => {
      await 봇처치(request, 누구!, 고른봇!.id, 구역자리.Beginner);
      const 목록 = await 봇목록(request, 누구!, 'Beginner');
      const 그봇 = 목록.find((b) => b.id === 고른봇!.id);
      await verify('봇을 처치한 직후 봇 목록에서 그 봇은 죽은 채다', 그봇?.isDead, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
