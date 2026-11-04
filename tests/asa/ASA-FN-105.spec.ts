import { defineCase, test, verify } from '@platform/kit';

import { 가방읽기, 아이템쓰기, 오류코드읽기, 템플릿찾기, 플레이어만들기, type 아이템, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-105',
  name: '장비에 아이템 사용을 부르면 409 「NOT_USABLE」로 막힌다',
  apiDoc: 2,
  precondition: ['짧은 검을 가진 캐릭터가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 나!: 플레이어;
  let 짧은검: 아이템 | undefined;

  await test.step('일회용 계정으로 캐릭터를 만든다', async () => {
    나 = await 플레이어만들기(request);
  });

  await test.step('짧은 검을 가진 캐릭터가 있는지 확인한다', async () => {
    짧은검 = 템플릿찾기(await 가방읽기(request, 나), 'sword_short');
    await verify('캐릭터 번호가 돌아온다', 나.캐릭터번호 > 0, true, {
      blocker: true,
    });
    await verify('짧은 검이 가방에 있다', 짧은검 !== undefined, true, {
      blocker: true,
    });
  });

  await test.step('짧은 검에 아이템 사용을 부른다', async () => {
    if (짧은검 === undefined) return;
    const 응답 = await 아이템쓰기(request, 나, 짧은검.id);
    const 코드 = await verify('짧은 검에 아이템 사용을 부른 응답 코드가 409 이다', 응답.status(), 409);
    const 오류 = await verify('짧은 검에 아이템 사용을 부른 오류 코드가 「NOT_USABLE」이다', await 오류코드읽기(응답), 'NOT_USABLE');
    await verify('장비에 아이템 사용을 부르면 409 「NOT_USABLE」로 막힌다', 코드 && 오류, true);
  });
});
