import { defineCase, test, verify } from '@platform/kit';

import { GM골드, 캐릭터읽기, 플레이어만들기, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-052',
  name: '첫 캐릭터 번호를 「X-Character-Id」에 넣어 골드를 주면 첫 캐릭터 골드가 100 늘어난다',
  apiDoc: 2,
  precondition: ['한 계정에 캐릭터가 둘 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 첫!: 플레이어;
  let 둘째!: 플레이어;

  await test.step('일회용 계정으로 캐릭터 둘을 만든다', async () => {
    첫 = await 플레이어만들기(request);
    둘째 = await 플레이어만들기(request, 'Warrior', 첫.토큰);
  });

  await test.step('한 계정에 캐릭터가 둘 있는지 확인한다', async () => {
    await verify('첫 캐릭터 번호가 돌아온다', 첫.캐릭터번호 > 0, true, {
      blocker: true,
    });
    await verify('둘째 캐릭터 번호가 돌아온다', 둘째.캐릭터번호 > 0, true, {
      blocker: true,
    });
  });

  await test.step('첫 캐릭터 번호를 「X-Character-Id」에 넣어 GM 골드 100 을 준다', async () => {
    const 첫전 = (await 캐릭터읽기(request, 첫)).gold;
    const 둘째전 = (await 캐릭터읽기(request, 둘째)).gold;
    await GM골드(request, 첫, 100);
    const 첫후 = (await 캐릭터읽기(request, 첫)).gold;
    const 둘째후 = (await 캐릭터읽기(request, 둘째)).gold;
    await verify('첫 캐릭터 번호를 「X-Character-Id」에 넣어 골드를 주면 첫 캐릭터 골드가 100 늘어난다', 첫후 - 첫전, 100);
    await verify('첫 캐릭터 번호를 「X-Character-Id」에 넣어 골드를 주면 둘째 캐릭터 골드는 그대로다', 둘째후, 둘째전);
  });
});
