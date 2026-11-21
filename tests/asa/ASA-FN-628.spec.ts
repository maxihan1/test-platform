import { defineCase, test, verify } from '@platform/kit';

import { 어드민부르기 } from './helpers/admin.helper.js';
import { 플레이어만들기, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-628',
  name: '어드민 강화 기록을 부르면 200 이 돌아온다',
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

  await test.step('어드민 강화 기록을 부른다', async () => {
    const 응답 = await 어드민부르기(admin, 'GET', `/admin/characters/${나.캐릭터번호}/enhance-history?limit=5`);
    await verify('어드민 강화 기록을 부르면 200 이 돌아온다', 응답.status(), 200);
  });
});
