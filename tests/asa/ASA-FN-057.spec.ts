import { defineCase, test, verify } from '@platform/kit';

import { 재화원장 } from './helpers/combat.helper.js';
import { 오류코드읽기, 플레이어만들기, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-057',
  name: '남의 캐릭터 번호로 재화 원장을 부르면 403 「FORBIDDEN」으로 막힌다',
  apiDoc: 1,
  techniques: ['동등 분할'],
  precondition: ['다른 계정의 캐릭터가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 나!: 플레이어;
  let 남!: 플레이어;

  await test.step('일회용 계정 둘로 캐릭터를 하나씩 만든다', async () => {
    나 = await 플레이어만들기(request);
    남 = await 플레이어만들기(request);
  });

  await test.step('다른 계정의 캐릭터가 있는지 확인한다', async () => {
    await verify('내 캐릭터 번호가 돌아온다', 나.캐릭터번호 > 0, true, {
      blocker: true,
    });
    await verify('다른 계정의 캐릭터 번호가 돌아온다', 남.캐릭터번호 > 0, true, { blocker: true });
  });

  await test.step('내 토큰에 남의 캐릭터 번호를 「X-Character-Id」로 넣어 재화 원장을 부른다', async () => {
    const 응답 = await 재화원장(request, {
      토큰: 나.토큰,
      캐릭터번호: 남.캐릭터번호,
    });
    const 코드 = await verify('남의 캐릭터 번호로 재화 원장을 부른 응답 코드가 403 이다', 응답.status(), 403);
    const 오류 = await verify('남의 캐릭터 번호로 재화 원장을 부른 오류 코드가 「FORBIDDEN」이다', await 오류코드읽기(응답), 'FORBIDDEN');
    await verify('남의 캐릭터 번호로 재화 원장을 부르면 403 「FORBIDDEN」으로 막힌다', 코드 && 오류, true);
  });
});
