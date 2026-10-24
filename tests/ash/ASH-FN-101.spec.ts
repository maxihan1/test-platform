import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정지우기, 될때까지, 몬스터처치, 새캐릭터, 스폰하나, 오류코드, type 캐릭터 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-101',
  name: '리젠 시간 − 2초가 지나기 전에 같은 임프 스폰을 다시 처치하면 409 「COOLDOWN」이다',
  platforms: ['android'],
  precondition: ['임프를 방금 처치한 새 캐릭터가 있다'],
  techniques: ['경계값 분석'],
  elements: ['monster:Imp'],
  params: null,
  expected: z.object({
    허용오차초: z.number().min(0.5).max(10).describe('다시 처치되는 시간의 허용 오차(초) — 0.5 이상 10 이하').default(2),
  }),
});

test(spec, async ({ admin, expected }) => {
  let 나: 캐릭터 | undefined;
  let 시작 = 0;
  let 첫응답 = 0;
  try {
    await test.step('임프를 방금 처치한 새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa101');
      const 스폰 = await 스폰하나(admin, 'Beginner', 'Imp');
      시작 = Date.now();
      첫응답 = (await 몬스터처치(admin, 나, 스폰)).status();
    });

    await test.step('방금 임프를 처치했는지 확인한다', async () => {
      await verify('임프를 방금 처치했다', 첫응답, 200, { blocker: true });
    });

    await test.step('리젠 시간 − 2초가 지나기 전에 같은 스폰을 다시 처치한다', async () => {
      const 응답 = await 몬스터처치(admin, 나!, await 스폰하나(admin, 'Beginner', 'Imp'));
      const 코드 = await verify('응답 코드가 409 다', 응답.status(), 409);
      const 이름 = await verify('오류 코드가 「COOLDOWN」이다', await 오류코드(응답), 'COOLDOWN');
      await verify('리젠 시간 − 2초가 지나기 전에 같은 임프 스폰을 다시 처치하면 409 「COOLDOWN」이다', 코드 && 이름, true);
    });

    await test.step('같은 스폰을 처치될 때까지 다시 보고한다', async () => {
      const 스폰 = await 스폰하나(admin, 'Beginner', 'Imp');
      const 걸린시간 = await 될때까지(async () => ((await 몬스터처치(admin, 나!, 스폰)).status() === 200 ? Date.now() - 시작 : undefined), 40_000, 500);
      const 이상 = await verify('다시 처치되기까지 18초 이상 걸린다', 걸린시간 >= 18_000, true);
      const 이내 = await verify('다시 처치되기까지 걸린 시간이 18초에 허용 오차를 더한 안이다', 걸린시간 <= 18_000 + expected.허용오차초 * 1000, true);
      await verify('같은 임프 스폰은 처음 처치 뒤 리젠 시간 − 2초인 18초가 지나야 다시 처치된다', 이상 && 이내, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
