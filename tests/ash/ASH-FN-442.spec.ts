import { defineCase, test, verify } from '@platform/kit';

import { 목록글, 새캐릭터자리, 칸들 } from './helpers/admin.helper.js';
import { 본문, 인증머리, type 캐릭터 } from './helpers/api.helper.js';
import { 캐릭터읽기, 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-442',
  name: 'PK 기록을 받으면 kills · deaths · alignment · records · alignmentHistory 가 온다',
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
      누구 = await 새캐릭터자리(admin, 'qafn442');
    });
    await test.step('새 전사 캐릭터의 자리를 확인한다', async () => {
      await verify('새 전사 캐릭터가 하늘빛 마을에 있다', (await 캐릭터읽기(admin, 누구!)).zone, 'Town', { blocker: true });
    });
    await test.step('PK 기록을 받는다', async () => {
      const 나 = 누구!;
      const 기록 = await 본문<object>(await request.get(`/characters/${String(나.번호)}/pk-history`, { headers: 인증머리(나) }), 'PK 기록');
      await verify(
        'PK 기록을 받으면 kills · deaths · alignment · records · alignmentHistory 가 온다',
        칸들(기록),
        목록글('kills', 'deaths', 'alignment', 'records', 'alignmentHistory'),
      );
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
