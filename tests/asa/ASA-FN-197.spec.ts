import { defineCase, test, verify } from '@platform/kit';

import { 가방읽기, GM아이템, 값읽기, 플레이어만들기, type 가방, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-197',
  name: '빨간 물약 10개에 989개를 더 받으면 999개 한 묶음이다',
  apiDoc: 2,
  techniques: ['경계값 분석'],
  precondition: ['빨간 물약 10개를 가진 캐릭터가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 첫째!: 플레이어;
  let 둘째!: 플레이어;

  await test.step('일회용 계정으로 빨간 물약 10개를 가진 캐릭터 둘을 만든다', async () => {
    첫째 = await 플레이어만들기(request);
    둘째 = await 플레이어만들기(request);
  });

  await test.step('빨간 물약 10개를 가진 캐릭터를 확인한다', async () => {
    const 첫째가방 = await 가방읽기(request, 첫째);
    const 둘째가방 = await 가방읽기(request, 둘째);
    await verify('첫째 캐릭터의 빨간 물약이 10개다', 첫째가방.items.find((i) => i.templateId === 'potion_hp_s')?.quantity, 10, { blocker: true });
    await verify('둘째 캐릭터의 빨간 물약이 10개다', 둘째가방.items.find((i) => i.templateId === 'potion_hp_s')?.quantity, 10, { blocker: true });
  });

  await test.step('GM 으로 빨간 물약 989개를 더 받는다', async () => {
    const 지금 = await 값읽기<가방>(await GM아이템(request, 첫째, 'potion_hp_s', 989));
    const 묶음 = 지금.items.filter((i) => i.templateId === 'potion_hp_s');
    const 하나 = await verify('빨간 물약 묶음이 하나다', 묶음.length, 1);
    const 개수 = await verify('그 묶음이 999개다', 묶음[0]?.quantity, 999);
    await verify('빨간 물약 10개에 989개를 더 받으면 999개 한 묶음이다', 하나 && 개수, true);
  });

  await test.step('GM 으로 빨간 물약 990개를 더 받는다', async () => {
    const 지금 = await 값읽기<가방>(await GM아이템(request, 둘째, 'potion_hp_s', 990));
    const 묶음 = 지금.items.filter((i) => i.templateId === 'potion_hp_s').sort((a, b) => b.quantity - a.quantity);
    const 둘 = await verify('빨간 물약 묶음이 둘이다', 묶음.length, 2);
    const 큰묶음 = await verify('큰 묶음이 999개다', 묶음[0]?.quantity, 999);
    const 작은묶음 = await verify('작은 묶음이 1개다', 묶음[1]?.quantity, 1);
    await verify('빨간 물약이 1000개가 되면 999개 묶음과 1개 묶음 둘이다', 둘 && 큰묶음 && 작은묶음, true);
  });
});
