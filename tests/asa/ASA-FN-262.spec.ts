import { defineCase, test, verify } from '@platform/kit';

import { 강화확률읽기 } from './helpers/enhance.helper.js';
import { 플레이어만들기, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-262',
  name: 'GM 설정의 목표 +8 강화 확률이 성공 30% · 실패 40% · 파괴 30% 다',
  apiDoc: 1,
  precondition: ['로그인한 캐릭터가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 나!: 플레이어;

  await test.step('일회용 계정으로 캐릭터를 만든다', async () => {
    나 = await 플레이어만들기(request);
  });

  await test.step('로그인한 캐릭터가 있는지 확인한다', async () => {
    await verify('캐릭터 번호가 돌아온다', 나.캐릭터번호 > 0, true, {
      blocker: true,
    });
  });

  await test.step('GM 설정의 강화 확률표를 읽는다', async () => {
    const 확률 = await 강화확률읽기(request, 나, 8);
    const 성공 = await verify('목표 +8 강화 성공 확률이 30% 다', 확률?.success, 0.3);
    const 실패 = await verify('목표 +8 강화 실패 확률이 40% 다', 확률?.fail, 0.4);
    const 파괴 = await verify('목표 +8 강화 파괴 확률이 30% 다', 확률?.destroy, 0.3);
    await verify('GM 설정의 목표 +8 강화 확률이 성공 30% · 실패 40% · 파괴 30% 다', 성공 && 실패 && 파괴, true);
  });
});
