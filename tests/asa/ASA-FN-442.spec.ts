import { defineCase, test, verify } from '@platform/kit';

import { 어드민요약읽기, 어드민원장읽기, 어드민캐릭터고치기, 어드민초기화 } from './helpers/admin.helper.js';
import { 플레이어만들기, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-442',
  name: '원장 「delta」를 다 더하면 캐릭터 요약의 골드와 같다',
  apiDoc: 1,
  precondition: ['골드를 고치고 초기화한 뒤 다시 고친 캐릭터가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request, admin }) => {
  let 나!: 플레이어;

  await test.step('일회용 캐릭터의 골드를 고치고 초기화한 뒤 다시 고친다', async () => {
    나 = await 플레이어만들기(request);
    await 어드민캐릭터고치기(admin, 나.캐릭터번호, { gold: 1234 });
    await 어드민초기화(admin, 나.캐릭터번호);
    await 어드민캐릭터고치기(admin, 나.캐릭터번호, { gold: 700 });
  });

  await test.step('마지막으로 고친 골드 700 을 확인한다', async () => {
    await verify('캐릭터 요약의 골드가 700 이다', (await 어드민요약읽기(admin, 나.캐릭터번호)).gold, 700, { blocker: true });
  });

  await test.step('원장과 캐릭터 요약을 읽는다', async () => {
    const 원장 = await 어드민원장읽기(admin, 나.캐릭터번호, 100);
    const 합계 = 원장.reduce((합, 줄) => 합 + 줄.delta, 0);
    const 요약 = await 어드민요약읽기(admin, 나.캐릭터번호);
    await verify('원장 「delta」를 다 더하면 캐릭터 요약의 골드와 같다', 합계, 요약.gold);
  });
});
