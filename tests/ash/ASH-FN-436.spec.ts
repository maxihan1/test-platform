import { defineCase, test, verify } from '@platform/kit';

import { 목록글, type 사용응답, 새캐릭터자리, 쓰기, 아이템번호, 칸들 } from './helpers/admin.helper.js';
import { 개수, 본문, type 캐릭터 } from './helpers/api.helper.js';
import { 가방읽기, 캐릭터읽기, 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-436',
  name: '빨간 물약을 쓰면 templateId · healHp · healMp · inventory 가 오고 물약이 9개 남는다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 하늘빛 마을에 있다'],
  elements: ['zone:Town', 'item:potion_hp_s'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 하늘빛 마을에 만든다', async () => {
      누구 = await 새캐릭터자리(admin, 'qafn436');
    });
    await test.step('새 전사 캐릭터의 자리를 확인한다', async () => {
      await verify('새 전사 캐릭터가 하늘빛 마을에 있다', (await 캐릭터읽기(admin, 누구!)).zone, 'Town', { blocker: true });
    });
    await test.step('빨간 물약 1개를 쓴다', async () => {
      const 나 = 누구!;
      const 응답 = await 본문<사용응답>(await 쓰기(request, 나, 아이템번호(await 가방읽기(admin, 나), 'potion_hp_s')), '아이템 쓰기');
      const 칸 = await verify('물약 사용 응답에 templateId · healHp · healMp · inventory 가 온다', 칸들(응답), 목록글('templateId', 'healHp', 'healMp', 'inventory'));
      const 남은 = await verify('빨간 물약이 9개 남는다', 개수(응답.inventory, 'potion_hp_s'), 9);
      await verify('빨간 물약을 쓰면 templateId · healHp · healMp · inventory 가 오고 물약이 9개 남는다', 칸 && 남은, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
