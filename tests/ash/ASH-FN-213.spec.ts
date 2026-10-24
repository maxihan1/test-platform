import { defineCase, test, verify } from '@platform/kit';

import { type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 새캐릭터, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { GM성향바꾸기 } from './helpers/pk.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-213',
  name: 'GM 으로 성향치를 1001 로 바꾸려 하면 성향치가 1000 을 넘지 않는다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 하늘빛 마을에 있다'],
  techniques: ['상태 전이'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qafn213');
    });
    await test.step('새 캐릭터가 하늘빛 마을에 있는지 확인한다', async () => {
      const 정보 = await 캐릭터정보받기(request, 누구!);
      await verify('새 캐릭터가 하늘빛 마을에 있다', 정보.zone, 'Town', { blocker: true });
    });
    await test.step('GM 으로 성향치를 1001 로 바꾼다', async () => {
      await GM성향바꾸기(request, 누구!, 1001);
      const 정보 = await 캐릭터정보받기(request, 누구!);
      await verify('GM 으로 성향치를 1001 로 바꾸려 하면 성향치가 1000 을 넘지 않는다', 정보.alignment.value <= 1000, true);
    });
    await test.step('GM 으로 성향치를 −1001 로 바꾼다', async () => {
      await GM성향바꾸기(request, 누구!, -1001);
      const 정보 = await 캐릭터정보받기(request, 누구!);
      await verify('GM 으로 성향치를 −1001 로 바꾸려 하면 성향치가 −1000 아래로 가지 않는다', 정보.alignment.value >= -1000, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
