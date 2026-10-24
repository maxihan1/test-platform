import { defineCase, test, verify } from '@platform/kit';

import { 가방, 계정지우기, 새캐릭터, 응답몸, 캐릭터읽기, type 가방정보, type 스탯, type 캐릭터 } from './helpers/game-state.helper.js';
import { 장착중인가, 해제응답 } from './helpers/admin-api.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-430',
  name: '가죽 갑옷을 해제하면 응답에 inventory 와 stats 가 있고 방어력이 4 내려간다',
  platforms: ['android'],
  precondition: ['가죽 갑옷을 장착한 새 캐릭터가 있다'],
  elements: ['item:armor_leather'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  let 갑옷 = 0;
  try {
    await test.step('새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa430');
    });

    await test.step('가죽 갑옷이 장착돼 있는지 확인한다', async () => {
      const 지금 = await 가방(admin, 나!);
      갑옷 = 지금.items.find((x) => x.templateId === 'armor_leather' && x.equippedSlot !== null)?.id ?? 0;
      await verify('가죽 갑옷이 장착돼 있다', 장착중인가(지금, 갑옷), true, { blocker: true });
    });

    await test.step('가죽 갑옷을 해제한다', async () => {
      const 전 = (await 캐릭터읽기(admin, 나!)).stats.defense;
      const 응답 = await 해제응답(admin, 나!, 갑옷);
      const 코드 = await verify('해제 응답이 200 이다', 응답.status(), 200);
      const 몸 = await 응답몸<{ inventory: 가방정보; stats: 스탯 }>(응답);
      const 가방칸 = await verify('응답에 inventory 가 있다', 'inventory' in 몸, true);
      const 스탯칸 = await verify('응답에 stats 가 있다', 'stats' in 몸, true);
      const 내림 = await verify('방어력이 4 내려간다', 전 - 몸.stats.defense, 4);
      await verify('가죽 갑옷을 해제하면 응답에 inventory 와 stats 가 있고 방어력이 4 내려간다', 코드 && 가방칸 && 스탯칸 && 내림, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
