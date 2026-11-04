import { defineCase, test, verify } from '@platform/kit';

import { 새아이템찾기 } from './helpers/enhance.helper.js';
import { 가방읽기, GM골드, GM아이템, 강화, 오류코드읽기, 템플릿찾기, 플레이어만들기, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-233',
  name: '+9 장비를 강화하면 「MAX_ENHANCE」로 막히지 않는다',
  apiDoc: 1,
  techniques: ['경계값 분석'],
  precondition: ['+9 짧은 검과 무기 강화 주문서를 가진 캐릭터가 있다', '+10 짧은 검과 무기 강화 주문서를 가진 캐릭터가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 나!: 플레이어;
  let 주문서번호 = 0;
  let 아홉번호 = 0;
  let 열번호 = 0;

  await test.step('일회용 계정으로 새 캐릭터를 만들고 +9 짧은 검 · +10 짧은 검 · 무기 강화 주문서를 받는다', async () => {
    나 = await 플레이어만들기(request);
    await GM골드(request, 나, 3000);
    await GM아이템(request, 나, 'scroll_weapon', 3);
    await GM아이템(request, 나, 'sword_short', 1, 9);
    await GM아이템(request, 나, 'sword_short', 1, 10);
  });

  await test.step('+9 짧은 검 · +10 짧은 검 · 무기 강화 주문서를 가진 캐릭터를 확인한다', async () => {
    const 지금 = await 가방읽기(request, 나);
    주문서번호 = 템플릿찾기(지금, 'scroll_weapon')?.id ?? 0;
    아홉번호 = 새아이템찾기(지금, 'sword_short', 9)?.id ?? 0;
    열번호 = 새아이템찾기(지금, 'sword_short', 10)?.id ?? 0;
    await verify('새 캐릭터 번호가 돌아온다', 나.캐릭터번호 > 0, true, {
      blocker: true,
    });
    await verify('가방에 무기 강화 주문서가 있다', 주문서번호 > 0, true, {
      blocker: true,
    });
    await verify('가방에 +9 짧은 검이 있다', 아홉번호 > 0, true, {
      blocker: true,
    });
    await verify('가방에 +10 짧은 검이 있다', 열번호 > 0, true, {
      blocker: true,
    });
  });

  await test.step('+9 짧은 검을 강화한다', async () => {
    const 응답 = await 강화(request, 나, 아홉번호, 주문서번호);
    await verify('+9 장비를 강화하면 「MAX_ENHANCE」로 막히지 않는다', (await 오류코드읽기(응답)) === 'MAX_ENHANCE', false);
  });

  await test.step('+10 짧은 검을 강화한다', async () => {
    const 응답 = await 강화(request, 나, 열번호, 주문서번호);
    await verify('+10 장비를 강화하면 「MAX_ENHANCE」로 막힌다', await 오류코드읽기(응답), 'MAX_ENHANCE');
  });
});
