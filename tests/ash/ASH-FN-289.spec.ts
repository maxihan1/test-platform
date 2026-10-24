import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 봇목록, 새캐릭터, 월드다시두기, type 캐릭터 } from './helpers/game-state.helper.js';
import { 내캐릭터읽기 } from './helpers/bot-auth.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-289',
  name: '봇을 다시 시드하면 초급 8명 · 중급 10명 · 보스 지역 2명이다',
  platforms: ['android'],
  precondition: ['로그인한 캐릭터가 있다'],
  elements: ['zone:Beginner', 'zone:Intermediate', 'zone:Boss'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('로그인한 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa289');
    });

    await test.step('로그인한 캐릭터를 확인한다', async () => {
      await verify('로그인한 캐릭터가 있다', (await 내캐릭터읽기(admin, 나!)).status(), 200, { blocker: true });
    });

    await test.step('월드를 다시 시드하고 구역마다 봇을 센다', async () => {
      await 월드다시두기(admin);
      const 봇들 = await 봇목록(admin, 나!);
      const 초급 = await verify('초급 봇이 8명이다', 봇들.filter((b) => b.zone === 'Beginner').length, 8);
      const 중급 = await verify('중급 봇이 10명이다', 봇들.filter((b) => b.zone === 'Intermediate').length, 10);
      const 보스 = await verify('보스 지역 봇이 2명이다', 봇들.filter((b) => b.zone === 'Boss').length, 2);
      await verify('봇을 다시 시드하면 초급 8명 · 중급 10명 · 보스 지역 2명이다', 초급 && 중급 && 보스, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
