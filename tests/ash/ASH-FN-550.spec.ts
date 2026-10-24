import { defineCase, test, verify } from '@platform/kit';

import {
  가방,
  강화하기,
  계정지우기,
  결과고정,
  고정목록,
  고정비우기,
  바꾸기,
  새아이템주기,
  새캐릭터,
  응답몸,
  type 강화응답,
  type 캐릭터,
} from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-550',
  name: '실패를 고정해도 안전 구간 강화는 성공하고 고정 목록에 「Fail」이 남는다',
  platforms: ['android'],
  precondition: ['+0 짧은 검과 주문서를 가진 새 캐릭터가 있다'],
  elements: ['item:scroll_weapon', 'item:sword_short'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  let 검 = 0;
  let 주문서 = 0;
  try {
    await test.step('+0 짧은 검과 주문서를 가진 새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa550');
      await 고정비우기(admin);
      await 바꾸기(admin, 나, { gold: 5000 });
      검 = (await 새아이템주기(admin, 나, 'sword_short')).id;
      주문서 = (await 새아이템주기(admin, 나, 'scroll_weapon', { 수량: 5 })).id;
    });

    await test.step('가방에 +0 짧은 검과 주문서가 있는지 확인한다', async () => {
      const 지금 = await 가방(admin, 나!);
      await verify('가방에 +0 짧은 검이 있다', 지금.items.find((x) => x.id === 검)?.enhanceLevel, 0, { blocker: true });
      await verify('가방에 주문서가 있다', 지금.items.find((x) => x.id === 주문서)?.quantity, 5, { blocker: true });
    });

    await test.step('강화 결과를 실패로 고정하고 +0 짧은 검을 강화한다', async () => {
      await 결과고정(admin, { enhance: ['Fail'] });
      const 응답 = await 강화하기(admin, 나!, 검, 주문서);
      const 코드 = await verify('강화 응답이 200 이다', 응답.status(), 200);
      const 성공 = await verify('강화 결과가 「Success」다', (await 응답몸<강화응답>(응답)).result, 'Success');
      const 남음 = await verify('고정 목록의 강화 줄에 「Fail」이 남아 있다', (await 고정목록(admin)).enhance.join(', '), 'Fail');
      await verify('실패를 고정해도 안전 구간 강화는 성공하고 고정 목록에 「Fail」이 남는다', 코드 && 성공 && 남음, true);
    });
  } finally {
    await 고정비우기(admin);
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
