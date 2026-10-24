import { defineCase, test, verify } from '@platform/kit';

import { type 스폰, 오류, type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 새캐릭터, 스폰앞으로, 스폰찾기, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 몬스터처치보내기 } from './helpers/world.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-096',
  name: '임프 스폰에 반달 임프로 처치를 보고하면 409 「INVALID_SPAWN」이다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 초록 들판 임프 스폰 앞에 있다'],
  techniques: ['동등 분할'],
  elements: ['monster:Imp', 'monster:VandalImp'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  let 스폰값: 스폰 | undefined;
  try {
    await test.step('새 전사 캐릭터를 초록 들판 임프 스폰 앞으로 보낸다', async () => {
      누구 = await 새캐릭터(admin, 'qafn096');
      스폰값 = await 스폰찾기(admin, 'Beginner', 'Imp');
      await 스폰앞으로(admin, 누구, 스폰값);
    });
    await test.step('새 전사 캐릭터가 초록 들판에 있는지 확인한다', async () => {
      await verify('새 전사 캐릭터가 초록 들판에 있다', (await 캐릭터정보받기(request, 누구!)).zone, 'Beginner', { blocker: true });
    });
    await test.step('임프 스폰에 반달 임프로 처치를 보고한다', async () => {
      const 응답 = await 몬스터처치보내기(request, 누구!, 'VandalImp', 스폰값!);
      const 본문값 = await 오류(응답);
      const 상태 = await verify('응답 코드가 409 이다', 응답.status(), 409);
      const 코드 = await verify('오류 코드가 「INVALID_SPAWN」이다', 본문값.code, 'INVALID_SPAWN');
      await verify('임프 스폰에 반달 임프로 처치를 보고하면 409 「INVALID_SPAWN」이다', 상태 && 코드, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
