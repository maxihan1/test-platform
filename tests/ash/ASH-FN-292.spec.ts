import { defineCase, test, verify } from '@platform/kit';

import { type 계정, 새계정 } from './helpers/api.helper.js';
import { 봇목록, 설정읽기, 월드초기화, 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-292',
  name: '봇을 다시 시드하면 평화형 · 반격형 · 선공형이 40% · 40% · 20% 다',
  platforms: ['android'],
  precondition: ['어드민 키가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 계정값: 계정 | undefined;
  try {
    await test.step('봇 목록을 받을 계정을 만든다', async () => {
      계정값 = await 새계정(admin, 'qafn292');
    });
    await test.step('어드민 키가 있는지 확인한다', async () => {
      const 설정 = await 설정읽기(admin);
      await verify('어드민 키가 있다', typeof 설정.enhance === 'object' && 설정.enhance !== null, true, { blocker: true });
    });
    await test.step('봇을 다시 시드한 뒤 봇 성향을 센다', async () => {
      await 월드초기화(admin);
      const 목록 = await 봇목록(request, 계정값!);
      const 비율 = (성향: string): number => Math.round((목록.filter((b) => b.temperament === 성향).length / 목록.length) * 100);
      const 있다 = await verify('봇이 한 명 이상 있다', 목록.length > 0, true);
      const 평화 = await verify('평화형이 40% 다', 비율('Peaceful'), 40);
      const 반격 = await verify('반격형이 40% 다', 비율('Retaliate'), 40);
      const 선공 = await verify('선공형이 20% 다', 비율('Aggressive'), 20);
      await verify('봇을 다시 시드하면 평화형 · 반격형 · 선공형이 40% · 40% · 20% 다', 있다 && 평화 && 반격 && 선공, true);
    });
  } finally {
    if (계정값 !== undefined) await 캐릭터지우기(admin, 계정값);
  }
});
