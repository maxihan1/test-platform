import { defineCase, test, verify } from '@platform/kit';

import { 오류, type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 구역자리, 살아있는봇, 새캐릭터, 순간이동, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 봇처치, PK공격 } from './helpers/pk.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-246',
  name: '마을 안에서 선량한 봇을 공격하면 409 「SAFE_ZONE」이다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 하늘빛 마을에 있다'],
  techniques: ['상태 전이'],
  elements: ['zone:Town', 'state:구역=마을', 'move:구역 마을→PK'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 가해: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터 둘을 하늘빛 마을에 만든다', async () => {
      const 가 = await 새캐릭터(admin, 'qafn246');
      가해 = 가;
      await 순간이동(admin, 가, 'Town');
    });
    await test.step('캐릭터가 하늘빛 마을에 있는지 확인한다', async () => {
      const 가정보 = await 캐릭터정보받기(request, 가해!);
      await verify('공격하는 캐릭터가 하늘빛 마을에 있다', 가정보.zone, 'Town', { blocker: true });
    });
    await test.step('마을 안 좌표로 선량한 봇을 공격한다', async () => {
      const 봇값 = await 살아있는봇(admin, 가해!, 'Beginner', 'Innocent');
      const 응답 = await PK공격(request, 가해!, 봇값, 구역자리.Town);
      const 코드인가 = await verify('응답 코드가 409 다', 응답.status(), 409);
      const 이름인가 = await verify('오류 코드가 「SAFE_ZONE」이다', (await 오류(응답)).code, 'SAFE_ZONE');
      await verify('마을 안에서 선량한 봇을 공격하면 409 「SAFE_ZONE」이다', 코드인가 && 이름인가, true);
    });
    await test.step('마을 안 좌표로 봇 처치를 보고한다', async () => {
      const 봇값 = await 살아있는봇(admin, 가해!, 'Beginner');
      const 응답 = await 봇처치(request, 가해!, 봇값, 구역자리.Town);
      const 코드인가 = await verify('응답 코드가 409 다', 응답.status(), 409);
      const 이름인가 = await verify('오류 코드가 「SAFE_ZONE」이다', (await 오류(응답)).code, 'SAFE_ZONE');
      await verify('마을 안 좌표로 봇 처치를 보고하면 409 「SAFE_ZONE」이다', 코드인가 && 이름인가, true);
    });
  } finally {
    if (가해 !== undefined) await 캐릭터지우기(admin, 가해);
  }
});
