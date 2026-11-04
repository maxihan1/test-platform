import { defineCase, test, verify } from '@platform/kit';

import { 어드민원장읽기, 어드민캐릭터고치기, 어드민캐릭터읽기 } from './helpers/admin.helper.js';
import { 플레이어만들기, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-436',
  name: '어드민으로 골드를 500 에서 800 으로 고치면 원장 맨 위 「reason」이 「ADMIN_ADJUST」다',
  apiDoc: 1,
  precondition: ['골드 500 인 캐릭터가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request, admin }) => {
  let 나!: 플레이어;

  await test.step('일회용 계정으로 캐릭터를 만든다', async () => {
    나 = await 플레이어만들기(request);
  });

  await test.step('골드 500 인 캐릭터를 확인한다', async () => {
    await verify('캐릭터 골드가 500 이다', (await 어드민캐릭터읽기(admin, 나.캐릭터번호)).gold, 500, { blocker: true });
  });

  await test.step('어드민으로 골드를 800 으로 고친다', async () => {
    await 어드민캐릭터고치기(admin, 나.캐릭터번호, { gold: 800 });
    const 맨위 = (await 어드민원장읽기(admin, 나.캐릭터번호, 5))[0];
    await verify('어드민으로 골드를 500 에서 800 으로 고치면 원장 맨 위 「reason」이 「ADMIN_ADJUST」다', 맨위?.reason, 'ADMIN_ADJUST');
    await verify('원장 맨 위 「delta」가 300 이다', 맨위?.delta, 300);
  });
});
