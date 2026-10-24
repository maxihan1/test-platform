import { defineCase, test, verify } from '@platform/kit';

import { type 스폰, type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 새캐릭터, 스폰앞으로, 스폰찾기, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 몬스터처치 } from './helpers/world.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-088',
  name: '임프 처치를 보고하면 응답에 goldGained · expGained · leveledUp · character 가 온다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 초록 들판 임프 스폰 앞에 있다'],
  elements: ['monster:Imp'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  let 스폰값: 스폰 | undefined;
  try {
    await test.step('새 전사 캐릭터를 초록 들판 임프 스폰 앞으로 보낸다', async () => {
      누구 = await 새캐릭터(admin, 'qafn088');
      스폰값 = await 스폰찾기(admin, 'Beginner', 'Imp');
      await 스폰앞으로(admin, 누구, 스폰값);
    });
    await test.step('새 전사 캐릭터가 초록 들판에 있는지 확인한다', async () => {
      await verify('새 전사 캐릭터가 초록 들판에 있다', (await 캐릭터정보받기(request, 누구!)).zone, 'Beginner', { blocker: true });
    });
    await test.step('임프 처치를 보고한다', async () => {
      const 결과 = await 몬스터처치(request, 누구!, 스폰값!);
      const 칸들 = Object.keys(결과);
      const 골드 = await verify('응답에 goldGained 가 있다', 칸들.includes('goldGained'), true);
      const 경험치 = await verify('응답에 expGained 가 있다', 칸들.includes('expGained'), true);
      const 레벨업 = await verify('응답에 leveledUp 이 있다', 칸들.includes('leveledUp'), true);
      const 캐릭터값 = await verify('응답에 character 가 있다', 칸들.includes('character'), true);
      await verify('임프 처치를 보고하면 응답에 goldGained · expGained · leveledUp · character 가 온다', 골드 && 경험치 && 레벨업 && 캐릭터값, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
