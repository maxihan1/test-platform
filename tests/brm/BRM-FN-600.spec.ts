import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { UTC시분글, 로그인화면준비, 분뒤정각, 시작시도, 안내창읽기 } from './helpers/login-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 점검끄기, 점검켜기 } from './helpers/game-state.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-600',
  name: '끝나는 시각이 있는 점검 중에 「게임 시작」을 누르면 점검 창에 「종료 예정: (UTC)」 줄이 보인다',
  platforms: ['android'],
  precondition: ['끝나는 시각을 정해 점검이 켜져 있다'],
  elements: ['state:점검=켜짐'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    점검분: z.number().int().min(5).describe('점검이 끝날 때까지 남은 분 — 5 이상').default(60),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  const 끝 = 분뒤정각(params.점검분);
  await test.cleanup('점검 끄기', () => 점검끄기(admin));
  await test.step('로그인 화면을 열고 끝나는 시각을 정해 점검을 켠다', async () => {
    await 로그인화면준비(game, driver);
    await 점검켜기(admin, { 안내: '[QA] 끝나는 시각 점검 시험', 끝 });
    await verify('로그인 화면이 보인다', await 지금화면(game), '로그인', { blocker: true });
  });
  await test.step('일반 회원 계정으로 「게임 시작」을 누른다', async () => {
    const 화면 = await 로그인화면.열기(game);
    await 시작시도(화면, 나);
    const 창 = await 안내창읽기(game, 30_000);
    await verify('점검 안내 창이 뜬다', 창 !== null, true, { blocker: true });
    const 줄 = await verify('점검 창에 「종료 예정: 」 줄이 보인다', 창?.본문원문.includes('종료 예정: ') === true, true);
    const 표준시 = await verify('「종료 예정」 줄에 「(UTC)」가 붙는다', 창?.본문원문.includes('(UTC)') === true, true);
    const 시각 = await verify('「종료 예정」 줄에 점검이 끝나는 시각이 보인다', 창?.본문원문.includes(UTC시분글(끝)) === true, true);
    await verify('끝나는 시각이 있는 점검 중에 「게임 시작」을 누르면 점검 창에 「종료 예정: (UTC)」 줄이 보인다', 줄 && 표준시 && 시각, true);
  });
});
