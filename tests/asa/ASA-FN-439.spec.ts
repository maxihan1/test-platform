import { defineCase, test, verify } from '@platform/kit';

import { 어드민원장읽기, 어드민캐릭터고치기, 어드민캐릭터읽기, 어드민초기화 } from './helpers/admin.helper.js';
import { 플레이어만들기, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-439',
  name: '어드민으로 초기화하면 원장 맨 위 「reason」이 「ADMIN_RESET」이다',
  apiDoc: 1,
  precondition: ['어드민으로 골드를 900 으로 고친 캐릭터가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request, admin }) => {
  let 나!: 플레이어;

  await test.step('일회용 캐릭터를 만들고 어드민으로 골드를 900 으로 고친다', async () => {
    나 = await 플레이어만들기(request);
    await 어드민캐릭터고치기(admin, 나.캐릭터번호, { gold: 900 });
  });

  await test.step('골드 900 인 캐릭터를 확인한다', async () => {
    await verify('캐릭터 골드가 900 이다', (await 어드민캐릭터읽기(admin, 나.캐릭터번호)).gold, 900, { blocker: true });
  });

  await test.step('어드민으로 캐릭터를 초기화한다', async () => {
    await 어드민초기화(admin, 나.캐릭터번호);
    const 맨위 = (await 어드민원장읽기(admin, 나.캐릭터번호, 5))[0];
    await verify('어드민으로 초기화하면 원장 맨 위 「reason」이 「ADMIN_RESET」이다', 맨위?.reason, 'ADMIN_RESET');
  });
});
