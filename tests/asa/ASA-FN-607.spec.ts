import { defineCase, test, verify } from '@platform/kit';

import { 어드민아이템주기 } from './helpers/admin.helper.js';
import { 플레이어만들기, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-607',
  name: '어드민으로 아이템을 주면 200 이 돌아온다',
  apiDoc: 1,
  precondition: ['일회용 캐릭터가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request, admin }) => {
  let 나!: 플레이어;

  await test.step('일회용 계정으로 캐릭터를 만든다', async () => {
    나 = await 플레이어만들기(request);
  });

  await test.step('일회용 캐릭터가 있는지 확인한다', async () => {
    await verify('새 캐릭터 번호가 돌아온다', 나.캐릭터번호 > 0, true, {
      blocker: true,
    });
  });

  await test.step('어드민으로 롱 소드 하나를 준다', async () => {
    const 응답 = await 어드민아이템주기(admin, 나.캐릭터번호, 'sword_long', 1, 0);
    await verify('어드민으로 아이템을 주면 200 이 돌아온다', 응답.status(), 200);
  });
});
