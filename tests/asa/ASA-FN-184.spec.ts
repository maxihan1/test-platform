import { defineCase, test, verify } from '@platform/kit';

import { 장착중인가 } from './helpers/character.helper.js';
import { 가방읽기, 계정만들기, 템플릿찾기, 플레이어만들기, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-184',
  name: '새 전사를 만들면 짧은 검 「sword_short」과 가죽 갑옷 「armor_leather」를 장착하고 있다',
  apiDoc: 1,
  precondition: ['새 전사가 있다', '새 궁수가 있다', '새 마법사가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 전사!: 플레이어;
  let 궁수!: 플레이어;
  let 마법사!: 플레이어;

  await test.step('일회용 계정으로 전사 · 궁수 · 마법사를 새로 만든다', async () => {
    const 토큰 = await 계정만들기(request);
    전사 = await 플레이어만들기(request, 'Warrior', 토큰);
    궁수 = await 플레이어만들기(request, 'Archer', 토큰);
    마법사 = await 플레이어만들기(request, 'Mage', 토큰);
  });

  await test.step('새 전사 · 궁수 · 마법사가 만들어졌는지 확인한다', async () => {
    await verify('새 전사 번호가 돌아온다', 전사.캐릭터번호 > 0, true, {
      blocker: true,
    });
    await verify('새 궁수 번호가 돌아온다', 궁수.캐릭터번호 > 0, true, {
      blocker: true,
    });
    await verify('새 마법사 번호가 돌아온다', 마법사.캐릭터번호 > 0, true, {
      blocker: true,
    });
  });

  await test.step('가방의 장착 장비를 읽는다', async () => {
    const 전사가방 = await 가방읽기(request, 전사);
    const 전사무기 = await verify('새 전사가 짧은 검 「sword_short」을 장착하고 있다', 장착중인가(템플릿찾기(전사가방, 'sword_short')), true);
    const 전사갑옷 = await verify('새 전사가 가죽 갑옷 「armor_leather」를 장착하고 있다', 장착중인가(템플릿찾기(전사가방, 'armor_leather')), true);
    await verify('새 전사를 만들면 짧은 검 「sword_short」과 가죽 갑옷 「armor_leather」를 장착하고 있다', 전사무기 && 전사갑옷, true);

    const 궁수가방 = await 가방읽기(request, 궁수);
    const 궁수무기 = await verify('새 궁수가 숏 보우 「bow_short」를 장착하고 있다', 장착중인가(템플릿찾기(궁수가방, 'bow_short')), true);
    const 궁수갑옷 = await verify('새 궁수가 가죽 갑옷 「armor_leather」를 장착하고 있다', 장착중인가(템플릿찾기(궁수가방, 'armor_leather')), true);
    await verify('새 궁수를 만들면 숏 보우 「bow_short」와 가죽 갑옷 「armor_leather」를 장착하고 있다', 궁수무기 && 궁수갑옷, true);

    const 마법사가방 = await 가방읽기(request, 마법사);
    const 마법사무기 = await verify('새 마법사가 참나무 지팡이 「staff_oak」를 장착하고 있다', 장착중인가(템플릿찾기(마법사가방, 'staff_oak')), true);
    const 마법사갑옷 = await verify(
      '새 마법사가 가죽 갑옷 「armor_leather」를 장착하고 있다',
      장착중인가(템플릿찾기(마법사가방, 'armor_leather')),
      true,
    );
    await verify('새 마법사를 만들면 참나무 지팡이 「staff_oak」와 가죽 갑옷 「armor_leather」를 장착하고 있다', 마법사무기 && 마법사갑옷, true);
  });
});
