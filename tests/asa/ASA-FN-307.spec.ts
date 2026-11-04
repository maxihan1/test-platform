import { defineCase, test, verify } from '@platform/kit';

import { 사망드랍구간읽기 } from './helpers/loot.helper.js';
import { 플레이어만들기, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-307',
  name: 'GM 설정의 성향치 −1 ~ −299 사망 드랍이 확률 25% · 장착 장비 빼고다',
  apiDoc: 2,
  precondition: ['로그인한 캐릭터가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 나!: 플레이어;

  await test.step('일회용 계정으로 캐릭터를 만든다', async () => {
    나 = await 플레이어만들기(request);
  });

  await test.step('캐릭터가 만들어졌는지 확인한다', async () => {
    await verify('캐릭터 번호가 돌아온다', 나.캐릭터번호 > 0, true, {
      blocker: true,
    });
  });

  await test.step('GM 설정의 사망 드랍 표를 읽는다', async () => {
    const 구간 = await 사망드랍구간읽기(request, 나, -1);
    const 확률 = await verify('GM 설정의 성향치 −1 ~ −299 사망 드랍 확률이 25% 다', 구간?.chance, 0.25);
    const 장비 = await verify('GM 설정의 성향치 −1 ~ −299 사망 드랍이 장착 장비를 포함하지 않는다', 구간?.includeEquipped, false);
    await verify('GM 설정의 성향치 −1 ~ −299 사망 드랍이 확률 25% · 장착 장비 빼고다', 확률 && 장비, true);
  });
});
