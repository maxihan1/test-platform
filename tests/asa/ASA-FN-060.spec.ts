import { defineCase, test, verify } from '@platform/kit';

import { 봇처치, 줍기 } from './helpers/combat.helper.js';
import { 부르기, 사냥터좌표, 오류코드읽기, 플레이어만들기, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-060',
  name: '없는 캐릭터 번호로 캐릭터를 부르면 404 「NOT_FOUND」다',
  apiDoc: 2,
  techniques: ['동등 분할'],
  precondition: ['로그인한 캐릭터가 있다'],
  params: null,
  expected: null,
});

const 없는번호 = 99999999;

test(spec, async ({ request }) => {
  let 나!: 플레이어;

  await test.step('일회용 계정으로 캐릭터를 만든다', async () => {
    나 = await 플레이어만들기(request);
  });

  await test.step('로그인한 캐릭터가 있는지 확인한다', async () => {
    await verify('캐릭터 번호가 돌아온다', 나.캐릭터번호 > 0, true, {
      blocker: true,
    });
  });

  await test.step('없는 캐릭터 번호로 캐릭터를 부른다', async () => {
    const 응답 = await 부르기(request, 'GET', `/characters/${없는번호}`, {
      토큰: 나.토큰,
    });
    const 코드 = await verify('없는 캐릭터 번호로 캐릭터를 부른 응답 코드가 404 이다', 응답.status(), 404);
    const 오류 = await verify('없는 캐릭터 번호로 캐릭터를 부른 오류 코드가 「NOT_FOUND」다', await 오류코드읽기(응답), 'NOT_FOUND');
    await verify('없는 캐릭터 번호로 캐릭터를 부르면 404 「NOT_FOUND」다', 코드 && 오류, true);
  });

  await test.step('없는 봇 번호로 봇 처치를 알린다', async () => {
    const 응답 = await 봇처치(request, 나, 없는번호, 사냥터좌표.Beginner);
    const 코드 = await verify('없는 봇 번호로 봇 처치를 알린 응답 코드가 404 이다', 응답.status(), 404);
    const 오류 = await verify('없는 봇 번호로 봇 처치를 알린 오류 코드가 「NOT_FOUND」다', await 오류코드읽기(응답), 'NOT_FOUND');
    await verify('없는 봇 번호로 봇 처치를 알리면 404 「NOT_FOUND」다', 코드 && 오류, true);
  });

  await test.step('없는 바닥 아이템 번호로 줍기를 부른다', async () => {
    const 응답 = await 줍기(request, 나, 없는번호, 사냥터좌표.Beginner);
    const 코드 = await verify('없는 바닥 아이템 번호로 줍기를 부른 응답 코드가 404 이다', 응답.status(), 404);
    const 오류 = await verify('없는 바닥 아이템 번호로 줍기를 부른 오류 코드가 「NOT_FOUND」다', await 오류코드읽기(응답), 'NOT_FOUND');
    await verify('없는 바닥 아이템 번호로 주우면 404 「NOT_FOUND」다', 코드 && 오류, true);
  });
});
