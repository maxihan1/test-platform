import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전으로, 로비로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기, 쓰러뜨리기 } from './helpers/game-state.helper.js';
import { 로그인화면준비, 상단바뜸, 상단바사라질때까지 } from './helpers/login-tools.helper.js';
import { 결과화면 } from './pages/postgame.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-510',
  name: '로그인 뒤 로비와 던전에서 공통 HUD 가 보이고 메인 메뉴로 돌아가면 사라진다',
  platforms: ['android'],
  precondition: ['로그인 화면이 떠 있다'],
  elements: ['state:접속=로그아웃', 'state:장소=로비', 'state:장소=던전'],
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
  await test.step('로그인 화면을 연다', async () => {
    await 로그인화면준비(game, driver);
    await verify('로그인 화면이 보인다', await 지금화면(game), '로그인', { blocker: true });
  });
  await test.step('로그인해 로비와 던전의 상단 바를 보고 「메인 메뉴로」 돌아간다', async () => {
    await 로비로(game, driver, 나);
    await verify('로비 화면이 보인다', await 지금화면(game), '로비', { blocker: true });
    const 로비보임 = await verify('로비에서 상단 바가 보인다', await 상단바뜸(game), true);
    await 던전으로(game, driver, 나, 0);
    await verify('던전 화면이 보인다', await 지금화면(game), '던전', { blocker: true });
    const 던전보임 = await verify('던전에서 상단 바가 보인다', await 상단바뜸(game), true);
    await 쓰러뜨리기(game);
    const 결과 = await 결과화면.열기(game, 90_000);
    await 결과.메인메뉴로();
    const 사라짐 = await verify('상단 바가 사라진다', await 상단바사라질때까지(game), true);
    await verify('로그인 뒤 로비와 던전에서 공통 HUD 가 보이고 메인 메뉴로 돌아가면 사라진다', 로비보임 && 던전보임 && 사라짐, true);
  });
});
