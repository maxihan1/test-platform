import { defineCase, test, verify } from '@platform/kit';

import { 새캐릭터자리 } from './helpers/admin.helper.js';
import { type 캐릭터 } from './helpers/api.helper.js';
import { 골드주기, 레벨주기, 성향주기, 캐릭터읽기, 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-532',
  name: '어드민으로 골드만 고치면 레벨 · 성향치는 그대로다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 하늘빛 마을에 있다'],
  elements: ['zone:Town'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 하늘빛 마을에 만든다', async () => {
      누구 = await 새캐릭터자리(admin, 'qafn532');
    });
    await test.step('새 전사 캐릭터의 레벨과 성향치를 바꿔 둔다', async () => {
      await 레벨주기(admin, 누구!, 5);
      await 성향주기(admin, 누구!, 100);
    });
    await test.step('새 전사 캐릭터의 자리를 확인한다', async () => {
      await verify('새 전사 캐릭터가 하늘빛 마을에 있다', (await 캐릭터읽기(admin, 누구!)).zone, 'Town', { blocker: true });
    });
    await test.step('골드만 주고 캐릭터를 고친다', async () => {
      const 나 = 누구!;
      const 전 = await 캐릭터읽기(admin, 나);
      const 후 = await 골드주기(admin, 나, 1234);
      const 레벨 = await verify('레벨이 그대로다', 후.level, 전.level);
      const 성향치 = await verify('성향치가 그대로다', 후.alignment.value, 전.alignment.value);
      await verify('어드민으로 골드만 고치면 레벨 · 성향치는 그대로다', 레벨 && 성향치, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
