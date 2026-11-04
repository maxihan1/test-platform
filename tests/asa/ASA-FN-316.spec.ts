import { defineCase, test, verify } from '@platform/kit';

import { 떨어뜨릴때까지죽기 } from './helpers/combat.helper.js';
import { 물약묶음만남기기 } from './helpers/loot.helper.js';
import { GM성향, 가방읽기, 사냥터좌표, 캐릭터읽기, 플레이어만들기, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-316',
  name: '물약 묶음만 가진 캐릭터가 죽어 아이템을 떨어뜨리면 물약 10개 묶음 전체가 떨어진다',
  apiDoc: 1,
  precondition: ['빨간 물약 묶음만 가진 성향치 −650 캐릭터가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 나!: 플레이어;

  await test.step('일회용 계정으로 캐릭터를 만들고 성향치를 −650 으로 낮춘 뒤 빨간 물약 묶음만 남긴다', async () => {
    나 = await 플레이어만들기(request);
    await GM성향(request, 나, -650);
    await 물약묶음만남기기(request, 나);
  });

  await test.step('빨간 물약 묶음만 가진 성향치 −650 캐릭터를 확인한다', async () => {
    const 지금 = await 캐릭터읽기(request, 나);
    const 가방 = await 가방읽기(request, 나);
    await verify('캐릭터 성향치가 −650 이다', 지금.alignment.value, -650, {
      blocker: true,
    });
    await verify('가방에 빨간 물약 묶음 하나만 있다', 가방.items.map((i) => i.templateId).join(', '), 'potion_hp_s', { blocker: true });
  });

  await test.step('아이템을 떨어뜨릴 때까지 사망을 알린다', async () => {
    const 결과 = await 떨어뜨릴때까지죽기(request, 나);
    const 떨군 = 결과.응답본문?.dropped;
    await verify('사망 드랍 아이템이 돌아온다', 떨군 !== undefined && 떨군 !== null, true, { blocker: true });
    await verify('물약 묶음만 가진 캐릭터가 죽어 아이템을 떨어뜨리면 물약 10개 묶음 전체가 떨어진다', 떨군?.quantity, 10);
    const 가로 = await verify('떨어뜨린 아이템의 x 좌표가 사망을 알린 x 좌표다', 떨군?.x, 사냥터좌표.Beginner.x);
    const 세로 = await verify('떨어뜨린 아이템의 z 좌표가 사망을 알린 z 좌표다', 떨군?.z, 사냥터좌표.Beginner.z);
    await verify('죽어 떨어뜨린 아이템의 좌표가 사망을 알린 좌표다', 가로 && 세로, true);
  });
});
