import { defineCase, test, verify } from '@platform/kit';

import { 가방읽기, GM성향, 값읽기, 캐릭터읽기, 템플릿찾기, 팔기, 플레이어만들기, type 가방, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-217',
  name: '악명 캐릭터가 빨간 물약 하나를 팔면 골드가 10 는다',
  apiDoc: 1,
  precondition: ['성향치가 0 보다 작은 캐릭터가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 나!: 플레이어;
  let 팔기전골드 = -1;
  let 물약번호 = 0;

  await test.step('일회용 계정으로 새 캐릭터를 만들고 성향치를 0 보다 작게 바꾼다', async () => {
    나 = await 플레이어만들기(request);
    await GM성향(request, 나, -100);
  });

  await test.step('성향치가 0 보다 작은 캐릭터를 확인한다', async () => {
    const 캐릭터 = await 캐릭터읽기(request, 나);
    const 지금 = await 가방읽기(request, 나);
    팔기전골드 = 지금.gold;
    물약번호 = 템플릿찾기(지금, 'potion_hp_s')?.id ?? 0;
    await verify('새 캐릭터 번호가 돌아온다', 나.캐릭터번호 > 0, true, {
      blocker: true,
    });
    await verify('캐릭터 성향치가 0 보다 작다', 캐릭터.alignment.value < 0, true, { blocker: true });
    await verify('가방에 빨간 물약이 있다', 물약번호 > 0, true, {
      blocker: true,
    });
  });

  await test.step('상점에 빨간 물약 하나를 판다', async () => {
    const 지금 = await 값읽기<가방>(await 팔기(request, 나, 물약번호, 1));
    await verify('악명 캐릭터가 빨간 물약 하나를 팔면 골드가 10 는다', 지금.gold - 팔기전골드, 10);
  });
});
