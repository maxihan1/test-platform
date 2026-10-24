import { defineCase, test, verify } from '@platform/kit';

import { 머리, 오류, 인증머리, type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 구역자리, 새캐릭터, 순간이동, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 봇처치보내기, 없는번호 } from './helpers/world.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-351',
  name: '없는 캐릭터 번호로 부르면 404 「NOT_FOUND」다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 하늘빛 마을에 있다', '새 전사 캐릭터가 초록 들판에 있다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qafn351');
    });
    await test.step('새 캐릭터가 하늘빛 마을에 있는지 확인한다', async () => {
      await verify('새 캐릭터가 하늘빛 마을에 있다', (await 캐릭터정보받기(request, 누구!)).zone, 'Town', { blocker: true });
    });
    await test.step('없는 캐릭터 번호로 캐릭터 정보를 받는다', async () => {
      const 응답 = await request.get(`/characters/${String(없는번호)}`, { headers: 인증머리(누구!) });
      const 본문값 = await 오류(응답);
      const 상태 = await verify('응답 코드가 404 이다', 응답.status(), 404);
      const 코드 = await verify('오류 코드가 「NOT_FOUND」이다', 본문값.code, 'NOT_FOUND');
      await verify('없는 캐릭터 번호로 부르면 404 「NOT_FOUND」다', 상태 && 코드, true);
    });
    await test.step('없는 아이템 번호를 장착한다', async () => {
      const 응답 = await request.post(`/characters/${String(누구!.번호)}/equip`, { headers: 인증머리(누구!), data: { itemId: 없는번호 } });
      const 본문값 = await 오류(응답);
      const 상태 = await verify('응답 코드가 404 이다', 응답.status(), 404);
      const 코드 = await verify('오류 코드가 「NOT_FOUND」이다', 본문값.code, 'NOT_FOUND');
      await verify('없는 아이템 번호로 장착하면 404 「NOT_FOUND」다', 상태 && 코드, true);
    });
    await test.step('캐릭터를 초록 들판으로 옮긴다', async () => {
      await 순간이동(admin, 누구!, 'Beginner');
    });
    await test.step('캐릭터가 초록 들판에 있는지 확인한다', async () => {
      await verify('새 전사 캐릭터가 초록 들판에 있다', (await 캐릭터정보받기(request, 누구!)).zone, 'Beginner', { blocker: true });
    });
    await test.step('없는 봇 번호로 봇 처치를 보고한다', async () => {
      const 응답 = await 봇처치보내기(request, 누구!, 없는번호, 구역자리.Beginner);
      const 본문값 = await 오류(응답);
      const 상태 = await verify('응답 코드가 404 이다', 응답.status(), 404);
      const 코드 = await verify('오류 코드가 「NOT_FOUND」이다', 본문값.code, 'NOT_FOUND');
      await verify('없는 봇 번호로 처치를 보고하면 404 「NOT_FOUND」다', 상태 && 코드, true);
    });
    await test.step('없는 바닥 아이템을 줍는다', async () => {
      const 응답 = await request.post(`/world/ground-items/${String(없는번호)}/pickup`, {
        headers: 머리(누구!),
        data: { x: 구역자리.Beginner.x, z: 구역자리.Beginner.z },
      });
      const 본문값 = await 오류(응답);
      const 상태 = await verify('응답 코드가 404 이다', 응답.status(), 404);
      const 코드 = await verify('오류 코드가 「NOT_FOUND」이다', 본문값.code, 'NOT_FOUND');
      await verify('없는 바닥 아이템을 주우면 404 「NOT_FOUND」다', 상태 && 코드, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
