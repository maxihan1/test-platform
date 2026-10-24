import { defineCase, test, verify } from '@platform/kit';

import { 새캐릭터자리 } from './helpers/admin.helper.js';
import { 찾기, type 캐릭터 } from './helpers/api.helper.js';
import { 가방읽기, 아이템주기, 캐릭터읽기, 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-535',
  name: '어드민 아이템 주기를 하면 가방에 철 장화가 들어온다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 하늘빛 마을에 있다'],
  elements: ['zone:Town', 'item:boots_iron'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 하늘빛 마을에 만든다', async () => {
      누구 = await 새캐릭터자리(admin, 'qafn535');
    });
    await test.step('새 전사 캐릭터의 자리를 확인한다', async () => {
      await verify('새 전사 캐릭터가 하늘빛 마을에 있다', (await 캐릭터읽기(admin, 누구!)).zone, 'Town', { blocker: true });
    });
    await test.step('어드민으로 철 장화 1개를 준다', async () => {
      const 나 = 누구!;
      await 아이템주기(admin, 나, 'boots_iron');
      await verify('어드민 아이템 주기를 하면 가방에 철 장화가 들어온다', 찾기(await 가방읽기(admin, 나), 'boots_iron') !== undefined, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
