import { defineCase, test, verify } from '@platform/kit';

import { 목록글, 목록칸들, 새캐릭터자리 } from './helpers/admin.helper.js';
import { 머리, 본문, type 스폰, type 캐릭터 } from './helpers/api.helper.js';
import { 캐릭터읽기, 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-457',
  name: '월드 스폰 표를 받으면 기본 스폰 49곳이 id · zone · monster · x · z 로 온다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 하늘빛 마을에 있다'],
  elements: ['zone:Town'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 하늘빛 마을에 만든다', async () => {
      누구 = await 새캐릭터자리(admin, 'qafn457');
    });
    await test.step('새 전사 캐릭터의 자리를 확인한다', async () => {
      await verify('새 전사 캐릭터가 하늘빛 마을에 있다', (await 캐릭터읽기(admin, 누구!)).zone, 'Town', { blocker: true });
    });
    await test.step('월드 스폰 표를 받는다', async () => {
      const 표 = await 본문<스폰[]>(await request.get('/world/spawns', { headers: 머리(누구!) }), '월드 스폰 표');
      const 곳수 = await verify('스폰이 49곳이다', 표.length, 49);
      const 칸 = await verify('스폰마다 id · zone · monster · x · z 가 온다', 목록칸들(표), 목록글('id', 'zone', 'monster', 'x', 'z'));
      await verify('월드 스폰 표를 받으면 기본 스폰 49곳이 id · zone · monster · x · z 로 온다', 곳수 && 칸, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
