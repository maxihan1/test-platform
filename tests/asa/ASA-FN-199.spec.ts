import { defineCase, test, verify } from '@platform/kit';

import { 가방읽기, GM아이템, 값읽기, 플레이어만들기, type 가방, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-199',
  name: '빨간 물약 10개에 995개를 더 받으면 넘친 6개가 새 칸에 들어간다',
  apiDoc: 1,
  precondition: ['빨간 물약 10개를 가진 캐릭터가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 나!: 플레이어;

  await test.step('일회용 계정으로 빨간 물약 10개를 가진 캐릭터를 만든다', async () => {
    나 = await 플레이어만들기(request);
  });

  await test.step('빨간 물약 10개를 가진 캐릭터를 확인한다', async () => {
    const 지금 = await 가방읽기(request, 나);
    await verify('캐릭터의 빨간 물약이 10개다', 지금.items.find((i) => i.templateId === 'potion_hp_s')?.quantity, 10, { blocker: true });
  });

  await test.step('GM 으로 빨간 물약 995개를 더 받는다', async () => {
    const 지금 = await 값읽기<가방>(await GM아이템(request, 나, 'potion_hp_s', 995));
    const 묶음 = 지금.items.filter((i) => i.templateId === 'potion_hp_s').sort((a, b) => b.quantity - a.quantity);
    const 둘 = await verify('빨간 물약 묶음이 둘이다', 묶음.length, 2);
    const 큰묶음 = await verify('큰 묶음이 999개다', 묶음[0]?.quantity, 999);
    const 새칸 = await verify('새 칸의 묶음이 6개다', 묶음[1]?.quantity, 6);
    await verify('빨간 물약 10개에 995개를 더 받으면 넘친 6개가 새 칸에 들어간다', 둘 && 큰묶음 && 새칸, true);
  });
});
