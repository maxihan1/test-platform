import { defineCase, test, verify } from '@platform/kit';

import type { 강화응답 } from './helpers/enhance.helper.js';
import { 가방읽기, GM아이템, 강화, 값읽기, 템플릿찾기, 플레이어만들기, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-235',
  name: '강화가 성공하면 강화 수치가 1 오른다',
  apiDoc: 1,
  precondition: ['무기 강화 주문서를 가진 캐릭터가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 나!: 플레이어;
  let 검번호 = 0;
  let 주문서번호 = 0;

  await test.step('일회용 계정으로 새 캐릭터를 만들고 무기 강화 주문서를 받는다', async () => {
    나 = await 플레이어만들기(request);
    await GM아이템(request, 나, 'scroll_weapon', 1);
  });

  await test.step('+0 짧은 검과 무기 강화 주문서를 가진 캐릭터를 확인한다', async () => {
    const 지금 = await 가방읽기(request, 나);
    주문서번호 = 템플릿찾기(지금, 'scroll_weapon')?.id ?? 0;
    검번호 = 템플릿찾기(지금, 'sword_short', 0)?.id ?? 0;
    await verify('새 캐릭터 번호가 돌아온다', 나.캐릭터번호 > 0, true, {
      blocker: true,
    });
    await verify('가방에 무기 강화 주문서가 있다', 주문서번호 > 0, true, {
      blocker: true,
    });
    await verify('가방에 +0 짧은 검이 있다', 검번호 > 0, true, {
      blocker: true,
    });
  });

  await test.step('+0 짧은 검을 강화한다', async () => {
    const 값 = await 값읽기<강화응답>(await 강화(request, 나, 검번호, 주문서번호));
    await verify('강화가 성공하면 강화 수치가 1 오른다', 값.toLevel - 값.fromLevel, 1);
  });
});
