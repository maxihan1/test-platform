import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 상점에서사기 } from './helpers/items.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { GM골드, GM스탯, 색글떼기, 스탯숫자 } from './helpers/gm.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-184',
  name: '장착하면 공격 배율이 바로 0.12 오른다',
  platforms: ['windows'],
  precondition: ['일반 회원 가방에 「강철 롱소드」가 있다', '일반 회원이 「강철 롱소드」를 장착했다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.userId ?? '';
  const 비밀번호 = params.userPassword ?? '';
  let 장착후배율 = 0;
  await test.cleanup('일반 회원을 기준 상태로 되돌리기', () => 계정되돌리기(admin, 아이디, 비밀번호, 'base'));

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('가방에 「강철 롱소드」가 있는 것을 확인한다', async () => {
    await GM골드(game, 1000);
    await 상점에서사기(game, ['강철 롱소드']);
    const 가방 = await 가방창.열기(game);
    await verify('가방에 「강철 롱소드」가 있다', await 가방.줄이생길때까지('강철 롱소드'), true, { blocker: true });
    await 가방.닫기();
  });

  await test.step('「강철 롱소드」를 장착하고 /gm stat 공격 배율을 읽는다', async () => {
    const 전 = 스탯숫자(await GM스탯(game), '공격배율');
    const 가방 = await 가방창.열기(game);
    await 가방.장착하기('강철 롱소드');
    await 가방.칸이될때까지('무기', '강철 롱소드');
    await 가방.닫기();
    장착후배율 = 스탯숫자(await GM스탯(game), '공격배율');
    await verify('장착하면 공격 배율이 바로 0.12 오른다', Math.round((장착후배율 - 전) * 100) / 100, 0.12);
  });

  await test.step('무기 칸의 「해제」를 누르고 /gm stat 공격 배율을 읽는다', async () => {
    const 가방 = await 가방창.열기(game);
    await verify('무기 칸에 「강철 롱소드」가 있다', 색글떼기(await 가방.칸글('무기')).includes('강철 롱소드'), true, { blocker: true });
    await 가방.해제하기('무기');
    await 가방.칸이비기까지('무기');
    await 가방.닫기();
    const 후 = 스탯숫자(await GM스탯(game), '공격배율');
    await verify('해제한 뒤 공격 배율이 바로 0.12 내려간다', Math.round((장착후배율 - 후) * 100) / 100, 0.12);
  });
});
