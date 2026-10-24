import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 될때까지, 계정지우기, 바꾸기, 새캐릭터, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';
import { 게임숫자 } from './helpers/world.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-603',
  name: '「회복」으로 찬 HP 가 최대 HP 의 35% 이고 36% 가 아니다',
  platforms: ['android'],
  precondition: ['마법사 새 캐릭터가 HP 가 깎인 채 월드에 있다'],
  techniques: ['경계값 분석'],
  held: '보류 — 게임 창을 못 엶(전투 HUD)',
  elements: ['class:Mage'],
  params: z.object({
    체력: z.string().describe('캐릭터 체력을 가진 오브젝트 주소 — 게임 화면에서 읽는다'),
    체력칸: z.string().describe('현재 체력 칸 — 게임 화면에서 읽는다 (컴포넌트.칸 꼴)'),
    회복버튼: z.string().describe('스킬 2 「회복」 버튼 오브젝트 주소 — 게임 화면에서 읽는다'),
    맞는퍼센트: z.number().int().min(1).max(100).describe('찬 HP 가 같아야 하는 최대 HP 비율(%) — 35').default(35),
    아닌퍼센트: z.number().int().min(1).max(100).describe('찬 HP 가 달라야 하는 최대 HP 비율(%) — 36').default(36),
    레벨: z.number().int().min(20).max(50).describe('마법사 레벨 — 두 비율이 정수로 갈리는 20 이상 50 이하').default(20),
  }),
  expected: null,
});

test(spec, async ({ admin, game, params }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('마법사 새 캐릭터를 만들고 레벨을 바꾼다', async () => {
      나 = await 새캐릭터(admin, 'zqa603', 'Mage');
      await 바꾸기(admin, 나, { level: params.레벨 });
    });

    await test.step('마법사의 HP 가 깎여 있는지 확인한다', async () => {
      const 최대 = (await 캐릭터읽기(admin, 나!)).stats.maxHp;
      const 지금 = await 게임숫자(game, params.체력, params.체력칸);
      await verify('마법사의 HP 가 깎여 있다', 지금 < 최대, true, { blocker: true });
    });

    await test.step('「회복」 뒤 HP 를 최대 HP 의 35% · 36% 와 견준다', async () => {
      const 최대 = (await 캐릭터읽기(admin, 나!)).stats.maxHp;
      const 전 = await 게임숫자(game, params.체력, params.체력칸);
      await game.click(params.회복버튼);
      const 후 = await 될때까지(async () => {
        const 지금 = await 게임숫자(game, params.체력, params.체력칸);
        return 지금 > 전 ? 지금 : undefined;
      }, 10_000);
      const 찬 = 후 - 전;
      const 맞는아래 = Math.floor((최대 * params.맞는퍼센트) / 100);
      const 맞는위 = Math.ceil((최대 * params.맞는퍼센트) / 100);
      const 아닌아래 = Math.floor((최대 * params.아닌퍼센트) / 100);
      const 아닌위 = Math.ceil((최대 * params.아닌퍼센트) / 100);
      const 맞음 = await verify('찬 HP 가 최대 HP 의 35% 와 같다', 찬 === 맞는아래 || 찬 === 맞는위, true);
      const 다름 = await verify('찬 HP 가 최대 HP 의 36% 와 다르다', 찬 === 아닌아래 || 찬 === 아닌위, false);
      await verify('「회복」으로 찬 HP 가 최대 HP 의 35% 이고 36% 가 아니다', 맞음 && 다름, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
