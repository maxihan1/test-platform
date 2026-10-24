import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 봇목록, 새캐릭터, 월드다시두기, type 캐릭터 } from './helpers/game-state.helper.js';
import { 내캐릭터읽기 } from './helpers/bot-auth.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-292',
  held: '보류 — 검증 실패: 평화형이 40% 다',
  name: '봇을 다시 시드하면 평화형 · 반격형 · 선공형이 40% · 40% · 20% 다',
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
      나 = await 새캐릭터(admin, 'zqa292');
    });

    await test.step('로그인한 캐릭터를 확인한다', async () => {
      await verify('로그인한 캐릭터가 있다', (await 내캐릭터읽기(admin, 나!)).status(), 200, { blocker: true });
    });

    await test.step('월드를 다시 시드하고 성향마다 봇을 센다', async () => {
      await 월드다시두기(admin);
      const 봇들 = await 봇목록(admin, 나!);
      const 비율 = (성향: string): number => Math.round((봇들.filter((b) => b.temperament === 성향).length / 봇들.length) * 100);
      const 평화형 = await verify('평화형이 40% 다', 비율('Peaceful'), 40);
      const 반격형 = await verify('반격형이 40% 다', 비율('Retaliate'), 40);
      const 선공형 = await verify('선공형이 20% 다', 비율('Aggressive'), 20);
      await verify('봇을 다시 시드하면 평화형 · 반격형 · 선공형이 40% · 40% · 20% 다', 평화형 && 반격형 && 선공형, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
