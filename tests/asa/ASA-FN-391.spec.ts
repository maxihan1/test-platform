import { defineCase, test, verify } from '@platform/kit';

import { 몬스터처치, 스폰목록, 재화원장 } from './helpers/combat.helper.js';
import { GM골드, 값읽기, 가방읽기, 강화, 사기, 템플릿찾기, 팔기, 플레이어만들기, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-391',
  name: '재화 원장의 「reason」이 모두 정해 둔 여덟 가운데 하나다',
  apiDoc: 1,
  precondition: ['상점 · 강화 · GM 골드 · 몬스터 처치를 한 캐릭터가 있다'],
  params: null,
  expected: null,
});

const 정해둔여덟 = ['CHARACTER_CREATED', 'MONSTER_KILL', 'SHOP_BUY', 'SHOP_SELL', 'ENHANCE', 'GM_GRANT', 'ADMIN_ADJUST', 'ADMIN_RESET'];

test(spec, async ({ request }) => {
  let 나!: 플레이어;
  const 응답코드: Record<string, number> = {};

  await test.step('일회용 계정으로 캐릭터를 만들고 GM 골드 · 상점 · 몬스터 처치 · 강화를 한다', async () => {
    나 = await 플레이어만들기(request);
    응답코드.골드 = (await GM골드(request, 나, 1000)).status();
    응답코드.구입 = (await 사기(request, 나, 'potion_hp_s', 1)).status();
    const 물약 = 템플릿찾기(await 가방읽기(request, 나), 'potion_hp_s');
    응답코드.판매 = (await 팔기(request, 나, 물약?.id ?? 0, 1)).status();
    const 자리 = (await 스폰목록(request, 나))[0];
    응답코드.처치 = 자리 === undefined ? 0 : (await 몬스터처치(request, 나, 자리)).status();
    응답코드.주문서 = (await 사기(request, 나, 'scroll_weapon', 1)).status();
    const 지금 = await 가방읽기(request, 나);
    const 무기 = 템플릿찾기(지금, 'sword_short');
    const 주문서 = 템플릿찾기(지금, 'scroll_weapon');
    응답코드.강화 = (await 강화(request, 나, 무기?.id ?? 0, 주문서?.id ?? 0)).status();
  });

  await test.step('상점 · 강화 · GM 골드 · 몬스터 처치를 한 캐릭터를 확인한다', async () => {
    await verify('캐릭터 번호가 돌아온다', 나.캐릭터번호 > 0, true, {
      blocker: true,
    });
    await verify('GM 골드 요청 응답 코드가 200 이다', 응답코드.골드, 200, {
      blocker: true,
    });
    await verify('상점 구입 요청 응답 코드가 200 이다', 응답코드.구입, 200, {
      blocker: true,
    });
    await verify('상점 판매 요청 응답 코드가 200 이다', 응답코드.판매, 200, {
      blocker: true,
    });
    await verify('몬스터 처치 요청 응답 코드가 200 이다', 응답코드.처치, 200, {
      blocker: true,
    });
    await verify('강화 요청 응답 코드가 200 이다', 응답코드.강화, 200, {
      blocker: true,
    });
  });

  await test.step('재화 원장을 부른다', async () => {
    const 줄들 = await 값읽기<{ reason: string | null }[]>(await 재화원장(request, 나));
    await verify('재화 원장에 줄이 여럿 있다', 줄들.length > 1, true, {
      blocker: true,
    });
    await verify(
      '재화 원장의 「reason」이 모두 정해 둔 여덟 가운데 하나다',
      줄들.every((줄) => 줄.reason !== null && 정해둔여덟.includes(줄.reason)),
      true,
    );
  });
});
