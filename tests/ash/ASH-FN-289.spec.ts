import { defineCase, test, verify } from '@platform/kit';

import { type 계정, 새계정 } from './helpers/api.helper.js';
import { 봇목록, 설정읽기, 월드초기화, 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-289',
  name: '봇을 다시 시드하면 초급 8명 · 중급 10명 · 보스 지역 2명이다',
  platforms: ['android'],
  precondition: ['어드민 키가 있다'],
  elements: ['zone:Beginner', 'zone:Boss', 'zone:Intermediate'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 계정값: 계정 | undefined;
  try {
    await test.step('봇 목록을 받을 계정을 만든다', async () => {
      계정값 = await 새계정(admin, 'qafn289');
    });
    await test.step('어드민 키가 있는지 확인한다', async () => {
      const 설정 = await 설정읽기(admin);
      await verify('어드민 키가 있다', typeof 설정.enhance, 'object', { blocker: true });
    });
    await test.step('봇을 전부 지우고 다시 시드한 뒤 봇 목록을 받는다', async () => {
      await 월드초기화(admin);
      const 목록 = await 봇목록(request, 계정값!);
      const 초급 = await verify('초급 봇이 8명이다', 목록.filter((b) => b.zone === 'Beginner').length, 8);
      const 중급 = await verify('중급 봇이 10명이다', 목록.filter((b) => b.zone === 'Intermediate').length, 10);
      const 보스 = await verify('보스 지역 봇이 2명이다', 목록.filter((b) => b.zone === 'Boss').length, 2);
      await verify('봇을 다시 시드하면 초급 8명 · 중급 10명 · 보스 지역 2명이다', 초급 && 중급 && 보스, true);
    });
  } finally {
    if (계정값 !== undefined) await 캐릭터지우기(admin, 계정값);
  }
});
