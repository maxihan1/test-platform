import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-502',
  name: '오른쪽 위 정보 상자를 읽으면 영웅을 고르기 전 정보 상자에 「환영합니다, P1!」와 「직업을 선택하세요」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  elements: ['zone:CharSelect'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  await test.cleanup('켜 둔 봇 끄기 · 일반 회원 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
  });
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    await 로비로(game, driver, 나);
    await verify('로비 화면이 보인다', await 지금화면(game), '로비', { blocker: true });
  });
  await test.step('오른쪽 위 정보 상자를 읽는다', async () => {
    const 로비 = await 로비화면.열기(game);
    const 환영 = await verify('정보 상자에 「환영합니다, P1!」가 보인다', await 로비.환영글(), '환영합니다, P1!');
    const 안내 = await verify('정보 상자에 「직업을 선택하세요」가 보인다', await 로비.직업안내글(), '직업을 선택하세요');
    await verify('오른쪽 위 정보 상자를 읽으면 영웅을 고르기 전 정보 상자에 「환영합니다, P1!」와 「직업을 선택하세요」가 보인다', 환영 && 안내, true);
  });
});
