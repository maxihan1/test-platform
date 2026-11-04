import { defineCase, test, verify } from '@platform/kit';

import { 가방읽기, GM아이템, 강화, 오류코드읽기, 템플릿찾기, 플레이어만들기, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-225',
  name: '무기에 방어구 강화 주문서를 쓰면 「SCROLL_MISMATCH」로 막힌다',
  apiDoc: 2,
  techniques: ['동등 분할'],
  precondition: ['방어구 강화 주문서를 가진 캐릭터가 있다', '무기 강화 주문서를 가진 캐릭터가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 나!: 플레이어;
  let 검번호 = 0;
  let 갑옷번호 = 0;
  let 방어구주문서번호 = 0;
  let 무기주문서번호 = 0;

  await test.step('일회용 계정으로 새 캐릭터를 만들고 강화 주문서를 받는다', async () => {
    나 = await 플레이어만들기(request);
    await GM아이템(request, 나, 'scroll_armor', 1);
    await GM아이템(request, 나, 'scroll_weapon', 1);
  });

  await test.step('방어구 강화 주문서와 무기 강화 주문서를 가진 캐릭터를 확인한다', async () => {
    const 지금 = await 가방읽기(request, 나);
    검번호 = 템플릿찾기(지금, 'sword_short')?.id ?? 0;
    갑옷번호 = 템플릿찾기(지금, 'armor_leather')?.id ?? 0;
    방어구주문서번호 = 템플릿찾기(지금, 'scroll_armor')?.id ?? 0;
    무기주문서번호 = 템플릿찾기(지금, 'scroll_weapon')?.id ?? 0;
    await verify('새 캐릭터 번호가 돌아온다', 나.캐릭터번호 > 0, true, {
      blocker: true,
    });
    await verify('가방에 방어구 강화 주문서가 있다', 방어구주문서번호 > 0, true, { blocker: true });
    await verify('가방에 무기 강화 주문서가 있다', 무기주문서번호 > 0, true, {
      blocker: true,
    });
    await verify('가방에 짧은 검이 있다', 검번호 > 0, true, { blocker: true });
    await verify('가방에 가죽 갑옷이 있다', 갑옷번호 > 0, true, {
      blocker: true,
    });
  });

  await test.step('짧은 검에 방어구 강화 주문서를 쓴다', async () => {
    const 응답 = await 강화(request, 나, 검번호, 방어구주문서번호);
    await verify('무기에 방어구 강화 주문서를 쓰면 「SCROLL_MISMATCH」로 막힌다', await 오류코드읽기(응답), 'SCROLL_MISMATCH');
  });

  await test.step('가죽 갑옷에 무기 강화 주문서를 쓴다', async () => {
    const 응답 = await 강화(request, 나, 갑옷번호, 무기주문서번호);
    await verify('갑옷에 무기 강화 주문서를 쓰면 「SCROLL_MISMATCH」로 막힌다', await 오류코드읽기(응답), 'SCROLL_MISMATCH');
  });
});
