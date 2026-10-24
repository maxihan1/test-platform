import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 될때까지, 계정지우기, 새캐릭터, 순간이동, 스폰하나, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';
import { 게임숫자, 배율범위안 } from './helpers/world.helper.js';

const 임프방어력 = 2;

export const spec = defineCase({
  tcId: 'ASH-FN-604',
  name: '기본 공격하면 데미지가 max(1, 공격력 − 방어력/2) 의 0.9~1.1 배 안이다',
  platforms: ['android'],
  precondition: ['새 캐릭터로 월드에 들어가 몬스터 앞에 있다'],
  held: '보류 — 게임 창을 못 엶(전투 HUD)',
  elements: ['monster:Imp'],
  params: z.object({
    몬스터: z.string().describe('몬스터 오브젝트 주소 — 게임 화면에서 읽는다'),
    체력칸: z.string().describe('몬스터 체력 칸 — 게임 화면에서 읽는다 (컴포넌트.칸 꼴)'),
    공격버튼: z.string().describe('기본 공격 버튼 오브젝트 주소 — 게임 화면에서 읽는다'),
  }),
  expected: null,
});

test(spec, async ({ admin, game, params }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('새 캐릭터를 몬스터 앞에 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa604');
      const 스폰 = await 스폰하나(admin, 'Beginner', 'Imp');
      await 순간이동(admin, 나, { x: 스폰.x, z: 스폰.z });
    });

    await test.step('새 캐릭터가 몬스터 앞에 있는지 확인한다', async () => {
      await verify('새 캐릭터가 몬스터 앞에 있다', (await game.find(params.몬스터)) !== null, true, { blocker: true });
    });

    await test.step('몬스터를 기본 공격한다', async () => {
      const 공격력 = (await 캐릭터읽기(admin, 나!)).stats.attack;
      const 전 = await 게임숫자(game, params.몬스터, params.체력칸);
      await game.click(params.공격버튼);
      const 후 = await 될때까지(async () => {
        const 지금 = await 게임숫자(game, params.몬스터, params.체력칸);
        return 지금 < 전 ? 지금 : undefined;
      }, 10_000);
      await verify('기본 공격하면 데미지가 max(1, 공격력 − 방어력/2) 의 0.9~1.1 배 안이다', 배율범위안(전 - 후, 공격력, 임프방어력, 1), true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
