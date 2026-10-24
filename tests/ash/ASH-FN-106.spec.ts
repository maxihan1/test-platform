import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 새캐릭터, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';
import { 무기줄, 상점목록, 장비전부해제 } from './helpers/world.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-106',
  name: '무기마다 공격력 · 구매가 · 판매가 · 상점 판매 여부가 아이템 표 값과 같다',
  platforms: ['android'],
  precondition: ['새 전사가 있다'],
  elements: ['item:sword_short', 'item:sword_long', 'item:bow_short', 'item:bow_long', 'item:staff_oak', 'item:axe_battle', 'class:Warrior'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('새 전사를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa106', 'Warrior');
    });

    await test.step('새 전사가 있는지 확인한다', async () => {
      const 읽음 = await 캐릭터읽기(admin, 나!);
      await verify('새 전사가 있다', 읽음.classType, 'Warrior', { blocker: true });
    });

    await test.step('무기를 하나씩 받아 장착하고 상점 목록과 가방을 읽는다', async () => {
      const 맨손 = (await 장비전부해제(admin, 나!)).attack;
      const 목록 = await 상점목록(admin, 나!);
      const 짧은검 = await verify.element('짧은 검의 공격력 · 구매가 · 판매가 · 상점 판매 여부가 아이템 표 값과 같다', 'item:sword_short', await 무기줄(admin, 나!, 목록, 'sword_short', 맨손), '공격력 8 · 구매가 300 · 판매가 100 · 상점 O');
      const 롱소드 = await verify.element('롱 소드의 공격력 · 구매가 · 판매가 · 상점 판매 여부가 아이템 표 값과 같다', 'item:sword_long', await 무기줄(admin, 나!, 목록, 'sword_long', 맨손), '공격력 14 · 구매가 1200 · 판매가 400 · 상점 O');
      const 숏보우 = await verify.element('숏 보우의 공격력 · 구매가 · 판매가 · 상점 판매 여부가 아이템 표 값과 같다', 'item:bow_short', await 무기줄(admin, 나!, 목록, 'bow_short', 맨손), '공격력 9 · 구매가 320 · 판매가 105 · 상점 O');
      const 롱보우 = await verify.element('롱 보우의 공격력 · 구매가 · 판매가 · 상점 판매 여부가 아이템 표 값과 같다', 'item:bow_long', await 무기줄(admin, 나!, 목록, 'bow_long', 맨손), '공격력 15 · 구매가 1300 · 판매가 430 · 상점 O');
      const 지팡이 = await verify.element('참나무 지팡이의 공격력 · 구매가 · 판매가 · 상점 판매 여부가 아이템 표 값과 같다', 'item:staff_oak', await 무기줄(admin, 나!, 목록, 'staff_oak', 맨손), '공격력 9 · 구매가 320 · 판매가 105 · 상점 O');
      const 액스 = await verify.element('배틀 액스의 공격력 · 구매가 · 판매가 · 상점 판매 여부가 아이템 표 값과 같다', 'item:axe_battle', await 무기줄(admin, 나!, 목록, 'axe_battle', 맨손), '공격력 20 · 구매가 - · 판매가 700 · 상점 X');
      await verify('무기마다 공격력 · 구매가 · 판매가 · 상점 판매 여부가 아이템 표 값과 같다', 짧은검 && 롱소드 && 숏보우 && 롱보우 && 지팡이 && 액스, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
