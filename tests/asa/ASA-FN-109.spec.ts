import { defineCase, test, verify } from '@platform/kit';

import { 봇목록, 스폰목록 } from './helpers/combat.helper.js';
import { 플레이어만들기, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-109',
  name: '스폰 표를 부르면 초록 들판 「Beginner」에 임프 스폰이 24곳이다',
  apiDoc: 1,
  precondition: ['로그인한 캐릭터가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 나!: 플레이어;

  await test.step('일회용 계정으로 캐릭터를 만든다', async () => {
    나 = await 플레이어만들기(request);
  });

  await test.step('캐릭터가 만들어졌는지 확인한다', async () => {
    await verify('캐릭터 번호가 돌아온다', 나.캐릭터번호 > 0, true, {
      blocker: true,
    });
  });

  await test.step('몬스터 스폰 표를 부른다', async () => {
    const 표 = await 스폰목록(request, 나);
    const 세기 = (구역이름: string, 몬스터: string) => 표.filter((s) => s.zone === 구역이름 && s.monster === 몬스터).length;
    await verify('스폰 표를 부르면 초록 들판 「Beginner」에 임프 스폰이 24곳이다', 세기('Beginner', 'Imp'), 24);
    await verify('스폰 표를 부르면 잿빛 숲 「Intermediate」에 반달 임프 스폰이 20곳이다', 세기('Intermediate', 'VandalImp'), 20);
    const 군주 = await verify('불꽃 군주의 폐허 「Boss」에 임프 군주 스폰이 1곳이다', 세기('Boss', 'ImpBoss'), 1);
    const 반달 = await verify('불꽃 군주의 폐허 「Boss」에 반달 임프 스폰이 4곳이다', 세기('Boss', 'VandalImp'), 4);
    await verify('스폰 표를 부르면 불꽃 군주의 폐허 「Boss」에 임프 군주 1곳과 반달 임프 4곳이 있다', 군주 && 반달, true);
  });

  await test.step('초록 들판 봇 목록을 부른다', async () => {
    const 레벨들 = (await 봇목록(request, 나, 'Beginner')).map((b) => b.level);
    await verify('초록 들판 봇이 한 마리 이상 돌아온다', 레벨들.length > 0, true);
    const 아래 = await verify('초록 들판 봇 레벨의 가장 낮은 값이 3 이상이다', Math.min(...레벨들) >= 3, true);
    const 위 = await verify('초록 들판 봇 레벨의 가장 높은 값이 7 이하다', Math.max(...레벨들) <= 7, true);
    await verify('초록 들판 봇 목록을 부르면 봇 레벨이 모두 3~7 이다', 아래 && 위, true);
  });

  await test.step('잿빛 숲 봇 목록을 부른다', async () => {
    const 레벨들 = (await 봇목록(request, 나, 'Intermediate')).map((b) => b.level);
    await verify('잿빛 숲 봇이 한 마리 이상 돌아온다', 레벨들.length > 0, true);
    const 아래 = await verify('잿빛 숲 봇 레벨의 가장 낮은 값이 9 이상이다', Math.min(...레벨들) >= 9, true);
    const 위 = await verify('잿빛 숲 봇 레벨의 가장 높은 값이 15 이하다', Math.max(...레벨들) <= 15, true);
    await verify('잿빛 숲 봇 목록을 부르면 봇 레벨이 모두 9~15 다', 아래 && 위, true);
  });

  await test.step('불꽃 군주의 폐허 봇 목록을 부른다', async () => {
    const 레벨들 = (await 봇목록(request, 나, 'Boss')).map((b) => b.level);
    await verify('불꽃 군주의 폐허 봇이 한 마리 이상 돌아온다', 레벨들.length > 0, true);
    const 아래 = await verify('불꽃 군주의 폐허 봇 레벨의 가장 낮은 값이 18 이상이다', Math.min(...레벨들) >= 18, true);
    const 위 = await verify('불꽃 군주의 폐허 봇 레벨의 가장 높은 값이 22 이하다', Math.max(...레벨들) <= 22, true);
    await verify('불꽃 군주의 폐허 봇 목록을 부르면 봇 레벨이 모두 18~22 다', 아래 && 위, true);
  });
});
