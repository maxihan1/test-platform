import { defineCase, test, verify } from '@platform/kit';

import { 새캐릭터자리 } from './helpers/admin.helper.js';
import { 머리, 본문, type 캐릭터 } from './helpers/api.helper.js';
import { 봇목록, 캐릭터읽기, 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-481',
  name: 'GM 봇 리셋에 zone 을 주면 그 구역 봇 수가 돌아온다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 하늘빛 마을에 있다'],
  elements: ['zone:Town', 'zone:Beginner'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 하늘빛 마을에 만든다', async () => {
      누구 = await 새캐릭터자리(admin, 'qafn481');
    });
    await test.step('새 전사 캐릭터의 자리를 확인한다', async () => {
      await verify('새 전사 캐릭터가 하늘빛 마을에 있다', (await 캐릭터읽기(admin, 누구!)).zone, 'Town', { blocker: true });
    });
    await test.step('GM 으로 초록 들판 봇을 리셋한다', async () => {
      const 나 = 누구!;
      const 응답 = await 본문<{ botCount: number }>(await request.post('/gm/bot/reset', { headers: 머리(나), data: { zone: 'Beginner' } }), 'GM 봇 리셋');
      await verify('GM 봇 리셋에 zone 을 주면 그 구역 봇 수가 돌아온다', 응답.botCount, (await 봇목록(admin, 나, 'Beginner')).length);
    });
    await test.step('GM 으로 봇 전체를 리셋한다', async () => {
      const 나 = 누구!;
      const 응답 = await 본문<{ botCount: number }>(await request.post('/gm/bot/reset', { headers: 머리(나), data: {} }), 'GM 봇 리셋');
      await verify('GM 봇 리셋에 zone 을 안 주면 전체 봇 수가 돌아온다', 응답.botCount, (await 봇목록(admin, 나)).length);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
