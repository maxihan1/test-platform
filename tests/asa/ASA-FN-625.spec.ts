import { defineCase, test, verify } from '@platform/kit';

import { 어드민가방읽기, 어드민부르기, 어드민아이템주기 } from './helpers/admin.helper.js';
import { 새아이템찾기 } from './helpers/enhance.helper.js';
import { 플레이어만들기, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-625',
  name: '어드민으로 아이템을 지우면 200 이 돌아온다',
  apiDoc: 1,
  precondition: ['어드민으로 롱 소드를 받은 캐릭터가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request, admin }) => {
  let 나!: 플레이어;
  let 롱소드번호 = 0;

  await test.step('일회용 캐릭터에게 어드민으로 롱 소드를 준다', async () => {
    나 = await 플레이어만들기(request);
    await 어드민아이템주기(admin, 나.캐릭터번호, 'sword_long', 1, 0);
  });

  await test.step('가방에 롱 소드가 있는지 확인한다', async () => {
    롱소드번호 = 새아이템찾기(await 어드민가방읽기(admin, 나.캐릭터번호), 'sword_long')?.id ?? 0;
    await verify('가방에 롱 소드가 있다', 롱소드번호 > 0, true, {
      blocker: true,
    });
  });

  await test.step('어드민으로 그 롱 소드를 지운다', async () => {
    const 응답 = await 어드민부르기(admin, 'DELETE', `/admin/characters/${나.캐릭터번호}/items/${롱소드번호}`);
    await verify('어드민으로 아이템을 지우면 200 이 돌아온다', 응답.status(), 200);
  });
});
