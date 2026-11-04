import { defineCase, test, verify } from '@platform/kit';

import { 사망알리기 } from './helpers/combat.helper.js';
import { 값읽기, 사냥터좌표, 위치옮기기, 캐릭터읽기, 플레이어만들기, type 캐릭터, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-139',
  name: '캐릭터가 죽으면 위치가 마을 부활 지점 (200, 30) 이다',
  apiDoc: 2,
  precondition: ['초록 들판에 선 캐릭터가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 나!: 플레이어;

  await test.step('일회용 계정으로 캐릭터를 만들고 초록 들판으로 옮긴다', async () => {
    나 = await 플레이어만들기(request);
    await 위치옮기기(request, 나, 사냥터좌표.Beginner.x, 사냥터좌표.Beginner.z);
  });

  await test.step('캐릭터가 초록 들판에 서 있는지 확인한다', async () => {
    const 지금 = await 캐릭터읽기(request, 나);
    await verify('캐릭터 구역이 「Beginner」다', 지금.zone, 'Beginner', {
      blocker: true,
    });
  });

  await test.step('사망을 알린다', async () => {
    const 죽음 = await 값읽기<{ character?: Partial<캐릭터> }>(await 사망알리기(request, 나, 사냥터좌표.Beginner));
    const 가로 = await verify('죽은 캐릭터 위치의 X 가 200 이다', 죽음.character?.position?.x, 200);
    const 세로 = await verify('죽은 캐릭터 위치의 Z 가 30 이다', 죽음.character?.position?.z, 30);
    await verify('캐릭터가 죽으면 위치가 마을 부활 지점 (200, 30) 이다', 가로 && 세로, true);
  });
});
