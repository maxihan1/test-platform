import { defineCase, test, verify } from '@platform/kit';

import type { 강화응답 } from './helpers/enhance.helper.js';
import { 가방읽기, GM아이템, 강화, 값읽기, 템플릿찾기, 플레이어만들기, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-226',
  name: '강화하면 무기 강화 주문서가 1장 준다',
  apiDoc: 2,
  precondition: ['무기 강화 주문서 3장을 가진 캐릭터가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 나!: 플레이어;
  let 검번호 = 0;
  let 주문서번호 = 0;
  let 주문서수 = -1;

  await test.step('일회용 계정으로 새 캐릭터를 만들고 무기 강화 주문서 3장을 받는다', async () => {
    나 = await 플레이어만들기(request);
    await GM아이템(request, 나, 'scroll_weapon', 3);
  });

  await test.step('무기 강화 주문서 3장을 가진 캐릭터를 확인한다', async () => {
    const 지금 = await 가방읽기(request, 나);
    const 주문서 = 템플릿찾기(지금, 'scroll_weapon');
    검번호 = 템플릿찾기(지금, 'sword_short')?.id ?? 0;
    주문서번호 = 주문서?.id ?? 0;
    주문서수 = 주문서?.quantity ?? -1;
    await verify('새 캐릭터 번호가 돌아온다', 나.캐릭터번호 > 0, true, {
      blocker: true,
    });
    await verify('가방의 무기 강화 주문서가 3장이다', 주문서수, 3, {
      blocker: true,
    });
    await verify('가방에 짧은 검이 있다', 검번호 > 0, true, { blocker: true });
  });

  await test.step('짧은 검을 강화한다', async () => {
    const 값 = await 값읽기<강화응답>(await 강화(request, 나, 검번호, 주문서번호));
    const 남은수 = 값.inventory?.items?.find((i) => i.id === 주문서번호)?.quantity ?? 0;
    await verify('강화하면 무기 강화 주문서가 1장 준다', 주문서수 - 남은수, 1);
  });
});
