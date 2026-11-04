import { defineCase, test, verify } from '@platform/kit';

import { 바닥아이템목록 } from './helpers/combat.helper.js';
import { 떨어진아이템만들기 } from './helpers/loot.helper.js';
import { 값읽기, 플레이어만들기, type 바닥아이템, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-379',
  name: '바닥 아이템 목록의 「expiresAt」이 모두 지금보다 뒤다',
  apiDoc: 1,
  precondition: ['로그인한 캐릭터가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 나!: 플레이어;

  await test.step('일회용 계정으로 캐릭터를 만들고 바닥에 아이템을 떨어뜨린다', async () => {
    나 = await 플레이어만들기(request);
    await 떨어진아이템만들기(request);
  });

  await test.step('캐릭터가 만들어졌는지 확인한다', async () => {
    await verify('캐릭터 번호가 돌아온다', 나.캐릭터번호 > 0, true, {
      blocker: true,
    });
  });

  await test.step('바닥 아이템 목록을 부른다', async () => {
    const 목록 = await 값읽기<바닥아이템[]>(await 바닥아이템목록(request, 나));
    const 지금 = Date.now();
    await verify('바닥 아이템 목록에 아이템이 있다', 목록.length > 0, true, {
      blocker: true,
    });
    await verify(
      '바닥 아이템 목록의 「expiresAt」이 모두 지금보다 뒤다',
      목록.every((것) => Date.parse(것.expiresAt) > 지금),
      true,
    );
  });
});
