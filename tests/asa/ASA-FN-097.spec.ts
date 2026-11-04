import { defineCase, test, verify } from '@platform/kit';

import { 캐릭터만들기, 캐릭터번호읽기, 캐릭터읽기, 캐릭터지우기, 플레이어만들기, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-097',
  name: '캐릭터를 지운 뒤 같은 이름으로 다시 만들면 새 캐릭터 「id」가 돌아온다',
  apiDoc: 2,
  precondition: ['캐릭터가 하나 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 나!: 플레이어;
  let 이름 = '';

  await test.step('일회용 계정으로 캐릭터를 만든다', async () => {
    나 = await 플레이어만들기(request);
  });

  await test.step('캐릭터가 만들어졌는지 확인한다', async () => {
    이름 = (await 캐릭터읽기(request, 나)).name;
    await verify('캐릭터 번호가 돌아온다', 나.캐릭터번호 > 0, true, {
      blocker: true,
    });
    await verify('캐릭터 이름이 있다', 이름 !== '', true, { blocker: true });
  });

  await test.step('캐릭터를 지운 뒤 같은 이름으로 다시 만든다', async () => {
    await 캐릭터지우기(request, 나);
    const 응답 = await 캐릭터만들기(request, 나.토큰, 'Warrior', 이름);
    await verify('캐릭터를 지운 뒤 같은 이름으로 다시 만들면 새 캐릭터 「id」가 돌아온다', (await 캐릭터번호읽기(응답)) > 0, true);
  });
});
