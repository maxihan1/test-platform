import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 색글떼기 } from './helpers/gm.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-496',
  name: '로비 오른쪽 위 정보 상자를 읽으면 로비 정보 상자에 「환영합니다,」로 시작하는 인사가 보인다',
  platforms: ['windows'],
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, params }) => {
  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, params.userId ?? '', params.userPassword ?? '');
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('로비 오른쪽 위 정보 상자를 읽는다', async () => {
    const 로비 = await 로비화면.열림(game);
    const 인사 = 색글떼기(await 로비.인사글읽기());
    await verify('로비 오른쪽 위 정보 상자를 읽으면 로비 정보 상자에 「환영합니다,」로 시작하는 인사가 보인다', 인사.startsWith('환영합니다,'), true);
    const 안내 = 색글떼기(await 로비.직업안내글읽기());
    await verify('로비 정보 상자에 「직업을 선택하세요」가 보인다', 안내.includes('직업을 선택하세요'), true);
  });
});
