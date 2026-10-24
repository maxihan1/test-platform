import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 될때까지, 계정지우기, 새캐릭터, 순간이동, 스폰하나, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';
import { 게임숫자, 배율범위안 } from './helpers/world.helper.js';

const 반달임프방어력 = 8;

export const spec = defineCase({
  tcId: 'ASH-FN-601',
  name: '스킬 1 · 스킬 2 를 쓰면 몬스터가 받은 데미지가 직업 표의 배율과 같다',
  platforms: ['android'],
  precondition: ['새 캐릭터로 월드에 들어가 몬스터 앞에 있다'],
  held: '보류 — 게임 창을 못 엶(전투 HUD)',
  elements: ['class:Warrior', 'monster:VandalImp'],
  params: z.object({
    몬스터: z.string().describe('몬스터 오브젝트 주소 — 게임 화면에서 읽는다'),
    체력칸: z.string().describe('몬스터 체력 칸 — 게임 화면에서 읽는다 (컴포넌트.칸 꼴)'),
    스킬1버튼: z.string().describe('스킬 1 버튼 오브젝트 주소 — 게임 화면에서 읽는다'),
    스킬2버튼: z.string().describe('스킬 2 버튼 오브젝트 주소 — 게임 화면에서 읽는다'),
  }),
  expected: null,
});

test(spec, async ({ admin, game, params }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('새 캐릭터를 몬스터 앞에 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa601', 'Warrior');
      const 스폰 = await 스폰하나(admin, 'Intermediate', 'VandalImp');
      await 순간이동(admin, 나, { x: 스폰.x, z: 스폰.z });
    });

    await test.step('새 캐릭터가 몬스터 앞에 있는지 확인한다', async () => {
      await verify('새 캐릭터가 몬스터 앞에 있다', (await game.find(params.몬스터)) !== null, true, { blocker: true });
    });

    await test.step('스킬 1 · 스킬 2 를 쓴다', async () => {
      const 공격력 = (await 캐릭터읽기(admin, 나!)).stats.attack;
      const 처음 = await 게임숫자(game, params.몬스터, params.체력칸);
      await game.click(params.스킬1버튼);
      const 스킬1후 = await 될때까지(async () => {
        const 지금 = await 게임숫자(game, params.몬스터, params.체력칸);
        return 지금 < 처음 ? 지금 : undefined;
      }, 10_000);
      await game.click(params.스킬2버튼);
      const 스킬2후 = await 될때까지(async () => {
        const 지금 = await 게임숫자(game, params.몬스터, params.체력칸);
        return 지금 < 스킬1후 ? 지금 : undefined;
      }, 10_000);
      const 첫째 = await verify('스킬 1 데미지가 직업 표의 배율 2 배 범위 안이다', 배율범위안(처음 - 스킬1후, 공격력, 반달임프방어력, 2), true);
      const 둘째 = await verify('스킬 2 데미지가 직업 표의 배율 1.2 배 범위 안이다', 배율범위안(스킬1후 - 스킬2후, 공격력, 반달임프방어력, 1.2), true);
      await verify('스킬 1 · 스킬 2 를 쓰면 몬스터가 받은 데미지가 직업 표의 배율과 같다', 첫째 && 둘째, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
