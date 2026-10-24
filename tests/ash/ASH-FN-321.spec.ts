import { defineCase, test, verify } from '@platform/kit';

import { type 봇, type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 구역자리, 봇읽기, 살아있는봇, 새캐릭터, 성향주기, 순간이동, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 사망보고 } from './helpers/world.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-321',
  name: '봇이 악명 캐릭터를 죽이면 그 봇의 성향치가 그대로다',
  platforms: ['android'],
  precondition: ['성향치 −100 인 새 전사 캐릭터가 초록 들판에 있다'],
  techniques: ['상태 전이'],
  elements: ['state:성향=악명', 'zone:Beginner'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  let 고른봇: 봇 | undefined;
  try {
    await test.step('성향치 −100 인 새 전사 캐릭터를 초록 들판으로 보내고 봇을 고른다', async () => {
      누구 = await 새캐릭터(admin, 'qafn321');
      await 성향주기(admin, 누구, -100);
      await 순간이동(admin, 누구, 'Beginner');
      고른봇 = await 살아있는봇(admin, 누구, 'Beginner');
    });
    await test.step('새 전사 캐릭터가 성향치 −100 으로 초록 들판에 있는지 확인한다', async () => {
      const 정보 = await 캐릭터정보받기(request, 누구!);
      await verify('새 전사 캐릭터의 성향치가 −100 이다', 정보.alignment.value, -100, { blocker: true });
      await verify('새 전사 캐릭터가 초록 들판에 있다', 정보.zone, 'Beginner', { blocker: true });
    });
    await test.step('악명 캐릭터가 봇에게 죽었다고 보고한다', async () => {
      const 나 = 누구!;
      const 이전 = (await 봇읽기(admin, 나, 고른봇!.id)).alignment.value;
      await 사망보고(request, 나, 구역자리.Beginner, { 종류: 'Bot', 번호: 고른봇!.id });
      const 이후 = (await 봇읽기(admin, 나, 고른봇!.id)).alignment.value;
      await verify('봇이 악명 캐릭터를 죽이면 그 봇의 성향치가 그대로다', 이후, 이전);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
