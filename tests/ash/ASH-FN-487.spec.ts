import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 드랍확률되돌리기, 새캐릭터, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';
import { GM드랍확률, GM설정 } from './helpers/admin-api.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-487',
  name: 'GM 드랍 설정을 바꾸면 봇 전리품 확률이 30% 로 보인다',
  platforms: ['android'],
  precondition: ['로그인한 캐릭터가 있다'],
  elements: ['drop:bot_loot'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('로그인한 새 캐릭터를 만들고 드랍 설정을 기본값으로 되돌린다', async () => {
      나 = await 새캐릭터(admin, 'zqa487');
      await 드랍확률되돌리기(admin);
    });

    await test.step('새 캐릭터를 어드민에서 읽을 수 있는지 확인한다', async () => {
      await verify('새 캐릭터를 어드민에서 읽을 수 있다', (await 캐릭터읽기(admin, 나!)).id, 나!.id, { blocker: true });
    });

    await test.step('GM 드랍 설정의 봇 전리품 확률을 30% 로 바꾼다', async () => {
      const 응답 = await GM드랍확률(admin, 나!, { botLootChance: 0.3 });
      const 코드 = await verify('GM 드랍 설정 응답이 200 이다', 응답.status(), 200);
      const 확률 = await verify('설정의 봇 전리품 확률이 30% 다', (await GM설정(admin, 나!)).drop.botLootChance, 0.3);
      await verify('GM 드랍 설정을 바꾸면 봇 전리품 확률이 30% 로 보인다', 코드 && 확률, true);
    });
  } finally {
    await 드랍확률되돌리기(admin);
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
