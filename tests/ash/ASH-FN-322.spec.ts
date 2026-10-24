import { defineCase, test, verify } from '@platform/kit';

import { type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 봇목록, 새캐릭터, 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-322',
  name: 'zone 을 Beginner 로 주고 봇 목록을 받으면 초록 들판 봇만 온다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 하늘빛 마을에 있다'],
  elements: ['zone:Beginner', 'zone:Boss', 'zone:Intermediate'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qafn322');
    });
    await test.step('새 캐릭터가 하늘빛 마을에 있는지 확인한다', async () => {
      await verify('새 캐릭터가 하늘빛 마을에 있다', (await 캐릭터정보받기(request, 누구!)).zone, 'Town', { blocker: true });
    });
    await test.step('초록 들판 봇 목록을 zone 을 주고 받는다', async () => {
      const 목록 = await 봇목록(request, 누구!, 'Beginner');
      const 있다 = await verify('봇이 한 명 이상 온다', 목록.length > 0, true);
      const 다른구역 = await verify('초록 들판이 아닌 봇이 하나도 오지 않는다', 목록.filter((b) => b.zone !== 'Beginner').length, 0);
      await verify('zone 을 Beginner 로 주고 봇 목록을 받으면 초록 들판 봇만 온다', 있다 && 다른구역, true);
    });
    await test.step('봇 목록을 zone 없이 받는다', async () => {
      const 목록 = await 봇목록(request, 누구!);
      const 초급 = await verify('초록 들판 봇이 온다', 목록.some((b) => b.zone === 'Beginner'), true);
      const 중급 = await verify('잿빛 숲 봇이 온다', 목록.some((b) => b.zone === 'Intermediate'), true);
      const 보스 = await verify('불꽃 군주의 폐허 봇이 온다', 목록.some((b) => b.zone === 'Boss'), true);
      await verify('zone 없이 봇 목록을 받으면 모든 구역 봇이 온다', 초급 && 중급 && 보스, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
