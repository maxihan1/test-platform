import { defineCase, test, verify } from '@platform/kit';

import {
  가방,
  강화하기,
  계정지우기,
  결과고정,
  고정비우기,
  바꾸기,
  새아이템주기,
  새캐릭터,
  응답몸,
  type 강화응답,
  type 캐릭터,
} from './helpers/game-state.helper.js';
import { 개수 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-184',
  name: '성공 고정으로 +3 롱 소드를 강화하면 결과가 「Success」이고 롱 소드가 +4 가 된다',
  platforms: ['android'],
  precondition: ['+3 롱 소드와 무기 강화 주문서를 가진 새 캐릭터가 있다'],
  elements: ['item:sword_long', 'item:scroll_weapon', 'rate:enhance_4'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  let 성공검 = 0;
  let 실패검 = 0;
  let 파괴검 = 0;
  let 주문서 = 0;
  try {
    await test.step('+3 롱 소드 세 자루와 무기 강화 주문서를 가진 새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa184');
      await 고정비우기(admin);
      await 바꾸기(admin, 나, { gold: 10000 });
      성공검 = (await 새아이템주기(admin, 나, 'sword_long', { 강화: 3 })).id;
      실패검 = (await 새아이템주기(admin, 나, 'sword_long', { 강화: 3 })).id;
      파괴검 = (await 새아이템주기(admin, 나, 'sword_long', { 강화: 3 })).id;
      주문서 = (await 새아이템주기(admin, 나, 'scroll_weapon', { 수량: 5 })).id;
    });

    await test.step('가방에 +3 롱 소드 세 자루와 무기 강화 주문서가 있는지 확인한다', async () => {
      const 지금 = await 가방(admin, 나!);
      const 단계 = [성공검, 실패검, 파괴검].map((번호) => String(지금.items.find((x) => x.id === 번호)?.enhanceLevel)).join(', ');
      await verify('가방에 +3 롱 소드가 세 자루 있다', 단계, '3, 3, 3', { blocker: true });
      await verify('무기 강화 주문서가 5장이다', 개수(지금, 'scroll_weapon'), 5, { blocker: true });
    });

    await test.step('강화 결과를 성공으로 고정하고 +3 롱 소드를 강화한다', async () => {
      await 결과고정(admin, { enhance: ['Success'] });
      const 응답 = await 강화하기(admin, 나!, 성공검, 주문서);
      const 코드 = await verify('성공 고정 강화 응답 코드가 200 이다', 응답.status(), 200);
      const 결과 = await verify('강화 결과가 「Success」다', (await 응답몸<강화응답>(응답)).result, 'Success');
      const 그검 = (await 가방(admin, 나!)).items.find((x) => x.id === 성공검);
      const 단계 = await verify('롱 소드가 +4 가 된다', 그검?.enhanceLevel, 4);
      await verify('성공 고정으로 +3 롱 소드를 강화하면 결과가 「Success」이고 롱 소드가 +4 가 된다', 코드 && 결과 && 단계, true);
    });

    await test.step('강화 결과를 실패로 고정하고 +3 롱 소드를 강화한다', async () => {
      await 결과고정(admin, { enhance: ['Fail'] });
      const 응답 = await 강화하기(admin, 나!, 실패검, 주문서);
      const 코드 = await verify('실패 고정 강화 응답 코드가 200 이다', 응답.status(), 200);
      const 결과 = await verify('강화 결과가 「Fail」이다', (await 응답몸<강화응답>(응답)).result, 'Fail');
      const 그검 = (await 가방(admin, 나!)).items.find((x) => x.id === 실패검);
      const 단계 = await verify('롱 소드가 +3 그대로다', 그검?.enhanceLevel, 3);
      await verify('실패 고정으로 +3 롱 소드를 강화하면 결과가 「Fail」이고 롱 소드가 +3 그대로다', 코드 && 결과 && 단계, true);
    });

    await test.step('강화 결과를 파괴로 고정하고 +3 롱 소드를 강화한다', async () => {
      await 결과고정(admin, { enhance: ['Destroy'] });
      const 응답 = await 강화하기(admin, 나!, 파괴검, 주문서);
      const 코드 = await verify('파괴 고정 강화 응답 코드가 200 이다', 응답.status(), 200);
      const 결과 = await verify('강화 결과가 「Destroy」다', (await 응답몸<강화응답>(응답)).result, 'Destroy');
      const 남음 = (await 가방(admin, 나!)).items.some((x) => x.id === 파괴검);
      const 사라짐 = await verify('롱 소드가 가방에 남아 있지 않다', 남음, false);
      await verify('파괴 고정으로 +3 롱 소드를 강화하면 결과가 「Destroy」이고 롱 소드가 가방에서 사라진다', 코드 && 결과 && 사라짐, true);
    });
  } finally {
    await 고정비우기(admin);
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
