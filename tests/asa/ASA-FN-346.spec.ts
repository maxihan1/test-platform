import { defineCase, test, verify } from '@platform/kit';

import { 봇목록 } from './helpers/combat.helper.js';
import { 플레이어만들기, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-346',
  name: '초록 들판 봇이 8명이다',
  apiDoc: 1,
  precondition: ['로그인한 캐릭터가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 나!: 플레이어;

  await test.step('일회용 계정으로 캐릭터를 만든다', async () => {
    나 = await 플레이어만들기(request);
  });

  await test.step('캐릭터가 만들어졌는지 확인한다', async () => {
    await verify('캐릭터 번호가 돌아온다', 나.캐릭터번호 > 0, true, {
      blocker: true,
    });
  });

  await test.step('초록 들판 봇 목록을 부른다', async () => {
    const 봇들 = await 봇목록(request, 나, 'Beginner');
    await verify('초록 들판 봇이 8명이다', 봇들.length, 8);
  });

  await test.step('잿빛 숲 봇 목록을 부른다', async () => {
    const 봇들 = await 봇목록(request, 나, 'Intermediate');
    await verify('잿빛 숲 봇이 10명이다', 봇들.length, 10);
  });

  await test.step('불꽃 군주의 폐허 봇 목록을 부른다', async () => {
    const 봇들 = await 봇목록(request, 나, 'Boss');
    await verify('불꽃 군주의 폐허 봇이 2명이다', 봇들.length, 2);
  });
});
