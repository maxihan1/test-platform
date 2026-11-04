import { defineCase, test, verify } from '@platform/kit';

import { GM드랍설정, 플레이어만들기, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-517',
  name: 'GM 드랍 설정에 빈 요청을 보내면 200 이 돌아온다',
  apiDoc: 2,
  precondition: ['로그인한 캐릭터가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 나!: 플레이어;

  await test.step('일회용 계정으로 캐릭터를 만든다', async () => {
    나 = await 플레이어만들기(request);
  });

  await test.step('캐릭터가 만들어졌는지 확인한다', async () => {
    await verify('캐릭터 번호가 돌아온다', 나.캐릭터번호 > 0, true, {
      blocker: true,
    });
  });

  await test.step('GM 드랍 설정에 빈 요청을 보낸다', async () => {
    const 응답 = await GM드랍설정(request, 나, {});
    await verify('GM 드랍 설정에 빈 요청을 보내면 200 이 돌아온다', 응답.status(), 200);
  });
});
