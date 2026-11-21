import { defineCase, test, verify } from '@platform/kit';

import { 어드민부르기 } from './helpers/admin.helper.js';
import { 계정만들기, 새캐릭터이름, 캐릭터만들기 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-544',
  name: '어드민 캐릭터 목록을 부르면 200 이 돌아온다',
  apiDoc: 1,
  precondition: ['일회용 캐릭터가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request, admin }) => {
  const 이름 = 새캐릭터이름();
  let 만들기코드 = 0;

  await test.step('일회용 계정으로 캐릭터를 만든다', async () => {
    만들기코드 = (await 캐릭터만들기(request, await 계정만들기(request), 'Warrior', 이름)).status();
  });

  await test.step('일회용 캐릭터가 만들어졌는지 확인한다', async () => {
    await verify('캐릭터 만들기 응답 코드가 201 이다', 만들기코드, 201, {
      blocker: true,
    });
  });

  await test.step('그 이름으로 어드민 캐릭터 목록을 부른다', async () => {
    const 응답 = await 어드민부르기(admin, 'GET', `/admin/characters?name=${이름}&limit=5`);
    await verify('어드민 캐릭터 목록을 부르면 200 이 돌아온다', 응답.status(), 200);
  });
});
