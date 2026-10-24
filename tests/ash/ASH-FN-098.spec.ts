import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정지우기, 몬스터처치, 새캐릭터, 오류코드, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';
import { 스폰들 } from './helpers/world.helper.js';

const 리쉬반경 = 25;

export const spec = defineCase({
  tcId: 'ASH-FN-098',
  name: '임프 스폰에서 리쉬 반경 + 14m 떨어진 곳에서 보고하면 처치된다',
  platforms: ['android'],
  precondition: ['새 캐릭터가 있다'],
  techniques: ['경계값 분석'],
  elements: ['monster:Imp'],
  params: z.object({
    안쪽거리: z.number().min(0).max(15).describe('처치되는 쪽 시험 거리(m) — 리쉬 반경 밖으로 0 이상 15 이하').default(14),
    바깥거리: z.number().gt(15).describe('처치되지 않는 쪽 시험 거리(m) — 리쉬 반경 밖으로 15 초과').default(15.5),
  }),
  expected: null,
});

test(spec, async ({ admin, params }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa098');
    });

    await test.step('새 캐릭터가 있는지 확인한다', async () => {
      await verify('새 캐릭터가 있다', (await 캐릭터읽기(admin, 나!)).name, 나!.이름, { blocker: true });
    });

    await test.step('임프 스폰 지점에서 리쉬 반경 + 14m 떨어진 곳에서 처치를 보고한다', async () => {
      const 스폰 = (await 스폰들(admin, 'Beginner', 'Imp'))[0]!;
      const 방향 = 스폰.x <= 200 ? 1 : -1;
      const 응답 = await 몬스터처치(admin, 나!, 스폰, { x: 스폰.x + 방향 * (리쉬반경 + params.안쪽거리) });
      await verify('임프 스폰에서 리쉬 반경 + 14m 떨어진 곳에서 보고하면 처치된다', 응답.status(), 200);
    });

    await test.step('임프 스폰 지점에서 리쉬 반경 + 15m 를 넘은 곳에서 처치를 보고한다', async () => {
      const 스폰 = (await 스폰들(admin, 'Beginner', 'Imp'))[1]!;
      const 방향 = 스폰.x <= 200 ? 1 : -1;
      const 응답 = await 몬스터처치(admin, 나!, 스폰, { x: 스폰.x + 방향 * (리쉬반경 + params.바깥거리) });
      const 코드 = await verify('응답 코드가 409 다', 응답.status(), 409);
      const 이름 = await verify('오류 코드가 「OUT_OF_RANGE」다', await 오류코드(응답), 'OUT_OF_RANGE');
      await verify('임프 스폰에서 리쉬 반경 + 15m 를 넘은 곳에서 보고하면 409 「OUT_OF_RANGE」다', 코드 && 이름, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
