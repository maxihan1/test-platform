import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 봇목록, 새캐릭터, type 캐릭터 } from './helpers/game-state.helper.js';
import { 내캐릭터읽기 } from './helpers/bot-auth.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-322',
  name: 'zone 에 「Beginner」를 주면 초록 들판 봇만 온다',
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
      나 = await 새캐릭터(admin, 'zqa322');
    });

    await test.step('로그인한 캐릭터를 확인한다', async () => {
      await verify('로그인한 캐릭터가 있다', (await 내캐릭터읽기(admin, 나!)).status(), 200, { blocker: true });
    });

    await test.step('zone 에 「Beginner」를 주고 봇 목록을 부른다', async () => {
      const 봇들 = await 봇목록(admin, 나!, 'Beginner');
      const 있음 = await verify('초록 들판 봇이 있다', 봇들.length > 0, true);
      const 다른구역 = await verify(
        '초록 들판이 아닌 봇이 없다',
        봇들
          .filter((b) => b.zone !== 'Beginner')
          .map((b) => `${b.name}: ${b.zone}`)
          .join(', '),
        '',
      );
      await verify('zone 에 「Beginner」를 주면 초록 들판 봇만 온다', 있음 && 다른구역, true);
    });

    await test.step('zone 없이 봇 목록을 부른다', async () => {
      const 봇들 = await 봇목록(admin, 나!);
      const 구역들 = [...new Set(봇들.map((b) => b.zone))].sort().join(', ');
      await verify('zone 없이 봇 목록을 부르면 세 구역 봇이 모두 온다', 구역들, 'Beginner, Boss, Intermediate');
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
