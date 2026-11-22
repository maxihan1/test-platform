import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 가방요약, 상점에서사기 } from './helpers/items.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 색글떼기 } from './helpers/gm.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-169',
  name: '상점에서 「조약돌」 2개를 사고 가방 창을 열면 같은 이름 전리품 2개는 가방에서 한 줄로 묶여 「조약돌」 뒤에 「x2」가 붙는다',
  platforms: ['windows'],
  precondition: ['일반 회원으로 로그인해 로비에 있고 가방이 기준 상태(체력 물약 3)다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.userId ?? '';
  const 비밀번호 = params.userPassword ?? '';
  await test.cleanup('일반 회원을 기준 상태로 되돌리기', () => 계정되돌리기(admin, 아이디, 비밀번호, 'base'));

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('가방이 기준 상태인 것을 확인한다', async () => {
    await verify('가방에 체력 물약 3개만 있다', await 가방요약(game), '체력 물약 x3', { blocker: true });
  });

  await test.step('상점에서 「조약돌」 2개를 사고 가방 창을 연다', async () => {
    await 상점에서사기(game, ['조약돌', '조약돌']);
    const 가방 = await 가방창.열기(game);
    await 가방.개수가될때까지('조약돌', 2);
    const 줄 = await 가방.줄찾기('조약돌');
    const 줄수 = await verify('같은 이름 전리품 2개는 가방에서 한 줄로 묶인다', await 가방.줄수('조약돌'), 1);
    const 글 = await verify('「조약돌」 뒤에 「x2」가 붙는다', 줄 === null ? '' : 색글떼기(줄.이름글), '조약돌 x2');
    await verify('상점에서 「조약돌」 2개를 사고 가방 창을 열면 같은 이름 전리품 2개는 가방에서 한 줄로 묶여 「조약돌」 뒤에 「x2」가 붙는다', 줄수 && 글, true);
    await 가방.닫기();
  });
});
