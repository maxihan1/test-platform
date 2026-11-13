import { defineCase, test, verify } from '@platform/kit';

import { 로그인화면까지 } from './helpers/login.helper.js';
import { 오른쪽위버튼 } from './components/corner.component.js';
import { 오른쪽위에있는지 } from './helpers/place.helper.js';

export const spec = defineCase({
  tcId: 'ARG-UI-303',
  name: '로그인 화면 오른쪽 위에 「X」 버튼과 톱니바퀴 버튼이 보인다',
  platforms: ['android'],
  precondition: ['게임을 켜 로그인 화면이 떠 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ game }) => {
  await test.step('로그인 화면을 연다', async () => {
    const 화면 = await 로그인화면까지(game);
    await verify('로그인 화면의 「게임 시작」이 보인다', await 화면.게임시작누를수있는지(), true, { blocker: true });
  });

  await test.step('로그인 화면 오른쪽 위를 확인한다', async () => {
    const X = await 오른쪽위에있는지(game, 오른쪽위버튼.X);
    const 톱니바퀴 = await 오른쪽위에있는지(game, 오른쪽위버튼.톱니바퀴);
    await verify('로그인 화면 오른쪽 위에 「X」 버튼과 톱니바퀴 버튼이 보인다', X && 톱니바퀴, true);
  });
});
