import { defineCase, test, verify } from '@platform/kit';

import { 몬스터처치, 사망알리기, 스폰고르기 } from './helpers/combat.helper.js';
import { 값읽기, 캐릭터읽기, 플레이어만들기, type 스폰, type 캐릭터, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-373',
  name: '사망을 알리면 응답의 경험치와 위치가 다시 불러온 캐릭터와 같다',
  apiDoc: 2,
  precondition: ['경험치가 있는 캐릭터가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 나!: 플레이어;
  let 자리: 스폰 | undefined;

  await test.step('일회용 계정으로 캐릭터를 만들고 임프를 처치해 경험치를 얻는다', async () => {
    나 = await 플레이어만들기(request);
    자리 = (await 스폰고르기(request, 나, 'Imp'))[0];
    if (자리 === undefined) return;
    await 몬스터처치(request, 나, 자리);
  });

  await test.step('캐릭터에 경험치가 있는지 확인한다', async () => {
    await verify('고른 임프 스폰이 있다', 자리 !== undefined, true, {
      blocker: true,
    });
    const 지금 = await 캐릭터읽기(request, 나);
    await verify('캐릭터 경험치가 0 보다 크다', 지금.exp > 0, true, {
      blocker: true,
    });
  });

  await test.step('사망을 알린 뒤 캐릭터를 다시 부른다', async () => {
    const 죽음 = await 값읽기<{ character?: Partial<캐릭터> }>(await 사망알리기(request, 나));
    const 다시 = await 캐릭터읽기(request, 나);
    const 경험치 = await verify('응답의 경험치가 다시 불러온 캐릭터와 같다', 죽음.character?.exp, 다시.exp);
    const 가로 = await verify('응답 위치의 X 가 다시 불러온 캐릭터와 같다', 죽음.character?.position?.x, 다시.position.x);
    const 높이 = await verify('응답 위치의 Y 가 다시 불러온 캐릭터와 같다', 죽음.character?.position?.y, 다시.position.y);
    const 세로 = await verify('응답 위치의 Z 가 다시 불러온 캐릭터와 같다', 죽음.character?.position?.z, 다시.position.z);
    await verify('사망을 알리면 응답의 경험치와 위치가 다시 불러온 캐릭터와 같다', 경험치 && 가로 && 높이 && 세로, true);
  });
});
