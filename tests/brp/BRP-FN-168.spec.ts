import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 가방요약, 상점에서사기 } from './helpers/items.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { GM골드 } from './helpers/gm.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-168',
  name: '상점에서 서로 다른 장비 6개를 사고 가방 창을 열면 장비를 6개 더 넣어도 가방이 거절하지 않아 가방 창에 장비 줄이 6개 생긴다',
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

  await test.step('상점에서 서로 다른 장비 6개를 사고 가방 창을 연다', async () => {
    await GM골드(game, 2000);
    await 상점에서사기(game, ['녹슨 단검', '가죽 갑옷', '행운의 반지', '현자의 목걸이', '강철 롱소드', '사슬 갑옷']);
    const 가방 = await 가방창.열기(game);
    await 가방.줄이생길때까지('사슬 갑옷');
    const 장비줄 = (await 가방.줄들()).filter((줄) => 줄.이름 !== '체력 물약').length;
    await verify('상점에서 서로 다른 장비 6개를 사고 가방 창을 열면 장비를 6개 더 넣어도 가방이 거절하지 않아 가방 창에 장비 줄이 6개 생긴다', 장비줄, 6);
    await 가방.닫기();
  });
});
