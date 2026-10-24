import { defineCase, test, verify } from '@platform/kit';

import { type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 레벨주기, 새캐릭터, 캐릭터읽기, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 레벨바꾸기시도 } from './helpers/world.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-062',
  name: '레벨을 50 으로 바꾸면 레벨이 50 이다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 하늘빛 마을에 있다', '레벨 50 새 전사 캐릭터가 있다'],
  techniques: ['경계값 분석'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 첫째: 캐릭터 | undefined;
  let 둘째: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 만든다', async () => {
      첫째 = await 새캐릭터(admin, 'qafn062');
    });
    await test.step('새 캐릭터가 하늘빛 마을에 있는지 확인한다', async () => {
      await verify('새 캐릭터가 하늘빛 마을에 있다', (await 캐릭터정보받기(request, 첫째!)).zone, 'Town', { blocker: true });
    });
    await test.step('레벨을 50 으로 바꾼다', async () => {
      await 레벨주기(admin, 첫째!, 50);
      const 정보 = await 캐릭터읽기(admin, 첫째!);
      await verify('레벨을 50 으로 바꾸면 레벨이 50 이다', 정보.level, 50);
    });
    await test.step('레벨 50 새 전사 캐릭터를 만든다', async () => {
      둘째 = await 새캐릭터(admin, 'qafn062');
      await 레벨주기(admin, 둘째, 50);
    });
    await test.step('새 전사 캐릭터가 레벨 50 인지 확인한다', async () => {
      await verify('새 전사 캐릭터가 레벨 50 이다', (await 캐릭터읽기(admin, 둘째!)).level, 50, { blocker: true });
    });
    await test.step('레벨을 51 로 바꾼다', async () => {
      await 레벨바꾸기시도(admin, 둘째!, 51);
      const 정보 = await 캐릭터읽기(admin, 둘째!);
      await verify('레벨을 51 로 바꾸려 하면 레벨이 50 을 넘지 않는다', 정보.level <= 50, true);
    });
  } finally {
    if (첫째 !== undefined) await 캐릭터지우기(admin, 첫째);
    if (둘째 !== undefined) await 캐릭터지우기(admin, 둘째);
  }
});
