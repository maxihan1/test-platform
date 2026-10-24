import { defineCase, test, verify } from '@platform/kit';

import { 본문, 인증머리, type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 새캐릭터, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 키목록 } from './helpers/world.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-325',
  name: '캐릭터 정보 JSON 필드 이름이 모두 camelCase 다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 하늘빛 마을에 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qafn325');
    });
    await test.step('새 캐릭터가 하늘빛 마을에 있는지 확인한다', async () => {
      await verify('새 캐릭터가 하늘빛 마을에 있다', (await 캐릭터정보받기(request, 누구!)).zone, 'Town', { blocker: true });
    });
    await test.step('캐릭터 정보를 받아 필드 이름을 읽는다', async () => {
      const 나 = 누구!;
      const 날것 = await 본문<unknown>(await request.get(`/characters/${String(나.번호)}`, { headers: 인증머리(나) }), '캐릭터 정보');
      const 이름들 = 키목록(날것).map((키) => 키.split('.').pop() ?? 키);
      const 있다 = await verify('필드 이름이 하나 이상 있다', 이름들.length > 0, true);
      const 없다 = await verify('camelCase 가 아닌 필드 이름이 하나도 없다', 이름들.filter((이름) => !/^[a-z][a-zA-Z0-9]*$/.test(이름)).length, 0);
      await verify('캐릭터 정보 JSON 필드 이름이 모두 camelCase 다', 있다 && 없다, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
