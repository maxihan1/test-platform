import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 될때까지, 계정지우기, 새캐릭터, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';
import { 게임숫자 } from './helpers/world.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-602',
  name: '마법사가 「회복」을 쓰면 최대 HP 의 35% 만큼 HP 가 찬다',
  platforms: ['android'],
  precondition: ['마법사 새 캐릭터가 HP 가 깎인 채 월드에 있다'],
  held: '보류 — 게임 창을 못 엶(전투 HUD)',
  elements: ['class:Mage'],
  params: z.object({
    체력: z.string().describe('캐릭터 체력을 가진 오브젝트 주소 — 게임 화면에서 읽는다'),
    체력칸: z.string().describe('현재 체력 칸 — 게임 화면에서 읽는다 (컴포넌트.칸 꼴)'),
    회복버튼: z.string().describe('스킬 2 「회복」 버튼 오브젝트 주소 — 게임 화면에서 읽는다'),
  }),
  expected: null,
});

test(spec, async ({ admin, game, params }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('마법사 새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa602', 'Mage');
    });

    await test.step('마법사의 HP 가 깎여 있는지 확인한다', async () => {
      const 최대 = (await 캐릭터읽기(admin, 나!)).stats.maxHp;
      const 지금 = await 게임숫자(game, params.체력, params.체력칸);
      await verify('마법사의 HP 가 깎여 있다', 지금 < 최대, true, { blocker: true });
    });

    await test.step('스킬 2 「회복」을 쓴다', async () => {
      const 최대 = (await 캐릭터읽기(admin, 나!)).stats.maxHp;
      const 전 = await 게임숫자(game, params.체력, params.체력칸);
      await game.click(params.회복버튼);
      const 후 = await 될때까지(async () => {
        const 지금 = await 게임숫자(game, params.체력, params.체력칸);
        return 지금 > 전 ? 지금 : undefined;
      }, 10_000);
      const 아래 = Math.floor((최대 * 35) / 100);
      const 위 = Math.ceil((최대 * 35) / 100);
      await verify('마법사가 「회복」을 쓰면 최대 HP 의 35% 만큼 HP 가 찬다', 후 - 전 === 아래 || 후 - 전 === 위, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
