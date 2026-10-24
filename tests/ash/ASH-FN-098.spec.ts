import { defineCase, test, verify } from '@platform/kit';

import { type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 새캐릭터, 순간이동, 스폰찾기, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 떨어진자리, 몬스터처치보내기 } from './helpers/world.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-098',
  name: '임프 스폰에서 리쉬 반경 + 14m(39m) 떨어진 곳에서 보고하면 처치가 받아들여진다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 초록 들판에 있다'],
  techniques: ['경계값 분석'],
  elements: ['monster:Imp', 'zone:Beginner'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 초록 들판으로 보낸다', async () => {
      누구 = await 새캐릭터(admin, 'qafn098');
      await 순간이동(admin, 누구, 'Beginner');
    });
    await test.step('새 전사 캐릭터가 초록 들판에 있는지 확인한다', async () => {
      await verify('새 전사 캐릭터가 초록 들판에 있다', (await 캐릭터정보받기(request, 누구!)).zone, 'Beginner', { blocker: true });
    });
    await test.step('임프 스폰에서 리쉬 반경 + 14m 떨어진 곳에서 처치를 보고한다', async () => {
      const 스폰값 = await 스폰찾기(admin, 'Beginner', 'Imp', 0);
      const 응답 = await 몬스터처치보내기(request, 누구!, 'Imp', 스폰값, 떨어진자리(스폰값, 39));
      const 상태 = await verify('응답 코드가 200 이다', 응답.status(), 200);
      const 받아들임 = await verify('처치 응답이 성공이다', 응답.ok(), true);
      await verify('임프 스폰에서 리쉬 반경 + 14m(39m) 떨어진 곳에서 보고하면 처치가 받아들여진다', 상태 && 받아들임, true);
    });
    await test.step('임프 스폰에서 리쉬 반경 + 15m 떨어진 곳에서 처치를 보고한다', async () => {
      const 스폰값 = await 스폰찾기(admin, 'Beginner', 'Imp', 1);
      const 응답 = await 몬스터처치보내기(request, 누구!, 'Imp', 스폰값, 떨어진자리(스폰값, 40));
      const 상태 = await verify('응답 코드가 200 이다', 응답.status(), 200);
      const 받아들임 = await verify('처치 응답이 성공이다', 응답.ok(), true);
      await verify('임프 스폰에서 리쉬 반경 + 15m(40m) 떨어진 곳에서 보고하면 처치가 받아들여진다', 상태 && 받아들임, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
