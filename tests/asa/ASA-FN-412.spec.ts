import { defineCase, test, verify } from '@platform/kit';

import { 어드민캐릭터고치기, 어드민캐릭터읽기 } from './helpers/admin.helper.js';
import { 값읽기, 플레이어만들기, type 캐릭터, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-412',
  name: '어드민으로 골드만 777 로 고치면 골드가 777 이다',
  apiDoc: 1,
  precondition: ['골드 500 인 1레벨 캐릭터가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request, admin }) => {
  let 나!: 플레이어;

  await test.step('일회용 계정으로 캐릭터를 만든다', async () => {
    나 = await 플레이어만들기(request);
  });

  await test.step('골드 500 인 1레벨 캐릭터를 확인한다', async () => {
    const 지금 = await 어드민캐릭터읽기(admin, 나.캐릭터번호);
    await verify('캐릭터 골드가 500 이다', 지금.gold, 500, { blocker: true });
    await verify('캐릭터 레벨이 1 이다', 지금.level, 1, { blocker: true });
    await verify('캐릭터 성향치가 0 이다', 지금.alignment?.value, 0, {
      blocker: true,
    });
  });

  await test.step('어드민으로 골드만 777 로 고친다', async () => {
    const 고친것 = await 값읽기<Partial<캐릭터>>(await 어드민캐릭터고치기(admin, 나.캐릭터번호, { gold: 777 }));
    await verify('어드민으로 골드만 777 로 고치면 골드가 777 이다', 고친것.gold, 777);
    const 다시 = await 어드민캐릭터읽기(admin, 나.캐릭터번호);
    await verify('골드만 고치면 레벨이 1 그대로다', 다시.level, 1);
    await verify('골드만 고치면 성향치가 0 그대로다', 다시.alignment?.value, 0);
  });
});
