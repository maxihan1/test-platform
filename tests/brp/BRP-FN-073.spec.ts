import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 캐릭터값기다리기 } from './helpers/game-state.helper.js';
import { GM레벨 } from './helpers/gm.helper.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-073',
  name: '레벨을 바꾸면 저장 뒤 운영 API 의 캐릭터 레벨이 7 이다',
  platforms: ['windows'],
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
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

  await test.step('GM 명령으로 레벨을 7 로 바꾼다', async () => {
    await GM레벨(game, 7);
    const 값 = await 캐릭터값기다리기(admin, 아이디, (c) => c.level === 7, 25_000);
    await verify('레벨을 바꾸면 저장 뒤 운영 API 의 캐릭터 레벨이 7 이다', 값.level, 7);
  });

  await test.step('상점에서 「조약돌」 1개를 산다', async () => {
    const 상점 = await 상점창.열기(game);
    await 상점.구매하기('조약돌');
    await 상점.닫기();
    const 값 = await 캐릭터값기다리기(admin, 아이디, (c) => (c.items['조약돌'] ?? 0) >= 1, 25_000);
    await verify('상점에서 산 「조약돌」이 저장 뒤 운영 API 의 캐릭터 아이템에 들어 있다', (값.items['조약돌'] ?? 0) >= 1, true);
  });
});
