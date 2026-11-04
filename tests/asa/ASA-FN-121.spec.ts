import { defineCase, test, verify } from '@platform/kit';

import { 장착장비수 } from './helpers/character.helper.js';
import { GM아이템, 가방읽기, 장비다해제, 장착, 캐릭터읽기, 템플릿찾기, 플레이어만들기, type 아이템, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-121',
  name: '+0 짧은 검 대신 +3 짧은 검을 장착하면 공격력이 6 더 높다',
  apiDoc: 2,
  precondition: ['장비를 다 해제한 1레벨 전사가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 나!: 플레이어;
  let 짧은검: 아이템 | undefined;
  let 강화짧은검: 아이템 | undefined;
  let 가죽갑옷: 아이템 | undefined;
  let 강화가죽갑옷: 아이템 | undefined;
  let 기준공격 = 0;
  let 기준방어 = 0;

  await test.step('일회용 계정으로 전사를 만들고 장비를 다 해제한 뒤 GM 으로 강화 장비를 받는다', async () => {
    나 = await 플레이어만들기(request, 'Warrior');
    await 장비다해제(request, 나);
    await GM아이템(request, 나, 'sword_short', 1, 3);
    await GM아이템(request, 나, 'armor_leather', 1, 2);
  });

  await test.step('장비를 다 해제한 1레벨 전사와 받은 장비를 확인한다', async () => {
    const 지금 = await 가방읽기(request, 나);
    짧은검 = 템플릿찾기(지금, 'sword_short', 0);
    강화짧은검 = 템플릿찾기(지금, 'sword_short', 3);
    가죽갑옷 = 템플릿찾기(지금, 'armor_leather', 0);
    강화가죽갑옷 = 템플릿찾기(지금, 'armor_leather', 2);
    await verify('캐릭터 번호가 돌아온다', 나.캐릭터번호 > 0, true, {
      blocker: true,
    });
    await verify('전사가 1레벨이다', (await 캐릭터읽기(request, 나)).level, 1, {
      blocker: true,
    });
    await verify('전사가 장착한 장비가 없다', 장착장비수(지금), 0, {
      blocker: true,
    });
    await verify('+0 짧은 검이 가방에 있다', 짧은검 !== undefined, true, {
      blocker: true,
    });
    await verify('받은 +3 짧은 검이 가방에 있다', 강화짧은검 !== undefined, true, { blocker: true });
    await verify('+0 가죽 갑옷이 가방에 있다', 가죽갑옷 !== undefined, true, {
      blocker: true,
    });
    await verify('받은 +2 가죽 갑옷이 가방에 있다', 강화가죽갑옷 !== undefined, true, { blocker: true });
  });

  await test.step('+0 짧은 검과 +0 가죽 갑옷을 장착한다', async () => {
    if (짧은검 === undefined || 가죽갑옷 === undefined) return;
    await 장착(request, 나, 짧은검.id);
    await 장착(request, 나, 가죽갑옷.id);
  });

  await test.step('+0 짧은 검과 +0 가죽 갑옷을 장착했는지 확인한다', async () => {
    const 능력치 = (await 캐릭터읽기(request, 나)).stats;
    기준공격 = 능력치.attack;
    기준방어 = 능력치.defense;
    await verify('+0 짧은 검과 +0 가죽 갑옷을 장착한 장비가 둘이다', 장착장비수(await 가방읽기(request, 나)), 2, { blocker: true });
  });

  await test.step('GM 으로 받은 +3 짧은 검을 장착한다', async () => {
    if (강화짧은검 === undefined) return;
    await 장착(request, 나, 강화짧은검.id);
    const 공격 = (await 캐릭터읽기(request, 나)).stats.attack;
    await verify('+0 짧은 검 대신 +3 짧은 검을 장착하면 공격력이 6 더 높다', 공격 - 기준공격, 6);
  });

  await test.step('GM 으로 받은 +2 가죽 갑옷을 장착한다', async () => {
    if (강화가죽갑옷 === undefined) return;
    await 장착(request, 나, 강화가죽갑옷.id);
    const 방어 = (await 캐릭터읽기(request, 나)).stats.defense;
    await verify('+0 가죽 갑옷 대신 +2 가죽 갑옷을 장착하면 방어력이 2 더 높다', 방어 - 기준방어, 2);
  });
});
