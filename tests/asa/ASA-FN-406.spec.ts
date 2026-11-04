import { defineCase, test, verify } from '@platform/kit';

import { 봇목록 } from './helpers/combat.helper.js';
import { GM봇리셋, 플레이어만들기, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-406',
  name: '불꽃 군주의 폐허 봇을 리셋하면 그 구역 봇 번호가 모두 바뀐다',
  apiDoc: 1,
  precondition: ['로그인한 캐릭터가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 나!: 플레이어;
  let 전번호: number[] = [];

  await test.step('일회용 계정으로 캐릭터를 만든다', async () => {
    나 = await 플레이어만들기(request);
  });

  await test.step('캐릭터와 리셋 전 불꽃 군주의 폐허 봇을 확인한다', async () => {
    전번호 = (await 봇목록(request, 나, 'Boss')).map((b) => b.id);
    await verify('캐릭터 번호가 돌아온다', 나.캐릭터번호 > 0, true, {
      blocker: true,
    });
    await verify('불꽃 군주의 폐허 봇이 있다', 전번호.length > 0, true, {
      blocker: true,
    });
  });

  await test.step('GM 으로 불꽃 군주의 폐허 봇을 리셋한다', async () => {
    await GM봇리셋(request, 나, 'Boss');
    const 후 = await 봇목록(request, 나, 'Boss');
    await verify('리셋 뒤 불꽃 군주의 폐허 봇이 있다', 후.length > 0, true, {
      blocker: true,
    });
    await verify(
      '불꽃 군주의 폐허 봇을 리셋하면 그 구역 봇 번호가 모두 바뀐다',
      후.every((b) => !전번호.includes(b.id)),
      true,
    );
  });
});
