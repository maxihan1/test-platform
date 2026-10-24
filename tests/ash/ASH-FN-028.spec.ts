import { defineCase, test, verify } from '@platform/kit';

import { type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 새캐릭터, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 스폰표받기 } from './helpers/world.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-028',
  name: '스폰 표를 받으면 불꽃 군주의 폐허에 임프 군주 1곳 · 반달 임프 4곳이 있다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 하늘빛 마을에 있다'],
  elements: ['monster:ImpBoss', 'monster:VandalImp', 'zone:Boss'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qafn028');
    });
    await test.step('새 캐릭터가 하늘빛 마을에 있는지 확인한다', async () => {
      await verify('새 캐릭터가 하늘빛 마을에 있다', (await 캐릭터정보받기(request, 누구!)).zone, 'Town', { blocker: true });
    });
    await test.step('몬스터 스폰 표를 받는다', async () => {
      const 표 = await 스폰표받기(request, 누구!);
      const 군주 = 표.filter((s) => s.zone === 'Boss' && s.monster === 'ImpBoss').length;
      const 반달임프 = 표.filter((s) => s.zone === 'Boss' && s.monster === 'VandalImp').length;
      const 군주한곳 = await verify('불꽃 군주의 폐허 임프 군주 스폰이 1곳이다', 군주, 1);
      const 반달넷 = await verify('불꽃 군주의 폐허 반달 임프 스폰이 4곳이다', 반달임프, 4);
      await verify('스폰 표를 받으면 불꽃 군주의 폐허에 임프 군주 1곳 · 반달 임프 4곳이 있다', 군주한곳 && 반달넷, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
