import { defineCase, test, verify } from '@platform/kit';

import { 목록글, 새캐릭터자리, 칸들 } from './helpers/admin.helper.js';
import { type 캐릭터 } from './helpers/api.helper.js';
import { 캐릭터읽기, 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-511',
  name: '어드민 캐릭터 정보에 CharacterDto 칸이 온다',
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
      누구 = await 새캐릭터자리(admin, 'qafn511');
    });
    await test.step('새 전사 캐릭터의 자리를 확인한다', async () => {
      await verify('새 전사 캐릭터가 하늘빛 마을에 있다', (await 캐릭터읽기(admin, 누구!)).zone, 'Town', { blocker: true });
    });
    await test.step('어드민으로 캐릭터 정보를 받는다', async () => {
      const 정보 = await 캐릭터읽기(admin, 누구!);
      await verify(
        '어드민 캐릭터 정보에 CharacterDto 칸이 온다',
        칸들(정보),
        목록글('id', 'name', 'classType', 'gender', 'level', 'exp', 'expToNext', 'gold', 'position', 'zone', 'stats', 'alignment', 'pkKills', 'pkDeaths'),
      );
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
