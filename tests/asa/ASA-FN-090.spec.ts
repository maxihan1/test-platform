import { defineCase, test, verify } from '@platform/kit';

import { 계정만들기, 오류코드읽기, 캐릭터만들기, 캐릭터읽기, 플레이어만들기, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-090',
  name: '이미 있는 캐릭터 이름으로 만들면 409 「NAME_TAKEN」으로 막힌다',
  apiDoc: 1,
  techniques: ['동등 분할'],
  precondition: ['다른 계정에 캐릭터가 하나 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 남!: 플레이어;
  let 남이름 = '';
  let 내토큰 = '';

  await test.step('일회용 계정 둘을 만들고 한 계정에만 캐릭터를 만든다', async () => {
    남 = await 플레이어만들기(request);
    내토큰 = await 계정만들기(request);
  });

  await test.step('다른 계정에 캐릭터가 하나 있는지 확인한다', async () => {
    남이름 = (await 캐릭터읽기(request, 남)).name;
    await verify('다른 계정의 캐릭터 번호가 돌아온다', 남.캐릭터번호 > 0, true, { blocker: true });
    await verify('내 계정 토큰이 돌아온다', 내토큰 !== '', true, {
      blocker: true,
    });
    await verify('다른 계정의 캐릭터 이름이 있다', 남이름 !== '', true, {
      blocker: true,
    });
  });

  await test.step('그 캐릭터와 같은 이름으로 캐릭터를 만든다', async () => {
    const 응답 = await 캐릭터만들기(request, 내토큰, 'Warrior', 남이름);
    const 코드 = await verify('같은 이름 캐릭터 만들기 응답 코드가 409 이다', 응답.status(), 409);
    const 오류 = await verify('같은 이름 캐릭터 만들기 오류 코드가 「NAME_TAKEN」이다', await 오류코드읽기(응답), 'NAME_TAKEN');
    await verify('이미 있는 캐릭터 이름으로 만들면 409 「NAME_TAKEN」으로 막힌다', 코드 && 오류, true);
  });
});
