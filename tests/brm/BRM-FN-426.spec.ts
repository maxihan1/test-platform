import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인화면준비, 시작시도 } from './helpers/login-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정상태, 점검끄기, 점검켜기 } from './helpers/game-state.helper.js';
import { 로그인화면 } from './pages/login.page.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-426',
  name: '일반 회원 계정으로 「게임 시작」을 누르면 허용 계정은 점검 중에도 로그인해 로비가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원 계정을 허용 계정으로 둔 점검이 켜져 있다'],
  elements: ['state:점검=켜짐', 'state:장소=로비'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    안내문구: z.string().min(1).describe('점검 안내 문구 — 아무 글이나 된다').default('[QA] 허용 계정 점검 시험'),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  await test.cleanup('점검 끄기', () => 점검끄기(admin));
  await test.step('로그인 화면을 연다', async () => {
    await 로그인화면준비(game, driver);
    await verify('로그인 화면이 보인다', await 지금화면(game), '로그인', { blocker: true });
  });
  await test.step('일반 회원 계정으로 「게임 시작」을 누른다', async () => {
    const 화면 = await 로그인화면.열기(game);
    const 계정번호 = (await 계정상태(admin, 나.아이디)).id;
    await 점검켜기(admin, { 안내: params.안내문구, 허용계정번호: [계정번호] });
    await 시작시도(화면, 나);
    const 로비 = await 로비화면.열기(game).then(
      () => true,
      () => false,
    );
    await verify('일반 회원 계정으로 「게임 시작」을 누르면 허용 계정은 점검 중에도 로그인해 로비가 보인다', 로비, true);
  });
});
