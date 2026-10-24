import { defineCase, test, verify } from '@platform/kit';

import { type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 새캐릭터, 순간이동, 스폰목록, 스폰앞으로, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 몬스터처치 } from './helpers/world.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-078',
  name: '임프를 10번 처치해도 받는 골드가 한 번도 8~15 밖으로 나가지 않는다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 초록 들판에 있다'],
  techniques: ['결정 테이블'],
  elements: ['flow:골드-몬스터처치', 'monster:Imp'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 초록 들판으로 보낸다', async () => {
      누구 = await 새캐릭터(admin, 'qafn078');
      await 순간이동(admin, 누구, 'Beginner');
    });
    await test.step('새 전사 캐릭터가 초록 들판에 있는지 확인한다', async () => {
      await verify('새 전사 캐릭터가 초록 들판에 있다', (await 캐릭터정보받기(request, 누구!)).zone, 'Beginner', { blocker: true });
    });
    await test.step('임프 스폰 10곳에서 처치를 보고한다', async () => {
      const 나 = 누구!;
      const 스폰들 = (await 스폰목록(admin)).filter((s) => s.zone === 'Beginner' && s.monster === 'Imp').slice(0, 10);
      const 받은: number[] = [];
      for (const 스폰값 of 스폰들) {
        await 스폰앞으로(admin, 나, 스폰값);
        받은.push((await 몬스터처치(request, 나, 스폰값)).goldGained);
      }
      const 열번 = await verify('임프를 10번 처치했다', 받은.length, 10);
      const 밖 = 받은.filter((골드) => 골드 < 8 || 골드 > 15);
      const 없다 = await verify('8~15 밖으로 나간 골드가 한 번도 없다', 밖.length, 0);
      await verify('임프를 10번 처치해도 받는 골드가 한 번도 8~15 밖으로 나가지 않는다', 열번 && 없다, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
