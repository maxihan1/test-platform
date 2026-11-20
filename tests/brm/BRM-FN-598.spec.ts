import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { UTC시분글, 로그인화면준비, 분뒤정각, 시작시도, 안내창읽기 } from './helpers/login-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정상태, 제재걸기, 제재풀기 } from './helpers/game-state.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-598',
  name: '끝나는 시각이 있는 정지 계정으로 「게임 시작」을 누르면 정지 창에 「종료 예정: (UTC)」 줄이 보인다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어 계정이 끝나는 시각을 정해 정지돼 있다'],
  elements: ['state:제재=정지'],
  params: z.object({
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    정지분: z.number().int().min(5).describe('정지가 끝날 때까지 남은 분 — 5 이상').default(60),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  let 제재번호: number | undefined;
  const 나 = 계정꺼내기(params.p2Id, params.p2Password, '두 번째 플레이어');
  const 끝 = 분뒤정각(params.정지분);
  await test.cleanup('두 번째 플레이어 정지 풀기', async () => {
    if (제재번호 !== undefined) await 제재풀기(admin, 제재번호);
  });
  await test.step('로그인 화면을 연다', async () => {
    await 로그인화면준비(game, driver);
    await verify('로그인 화면이 보인다', await 지금화면(game), '로그인', { blocker: true });
  });
  await test.step('두 번째 플레이어 계정에 끝나는 시각을 정해 정지를 건다', async () => {
    제재번호 = await 제재걸기(admin, (await 계정상태(admin, 나.아이디)).id, 'SUSPEND', '[QA] 끝나는 시각 정지 시험', 끝);
    await verify('두 번째 플레이어 계정이 정지돼 있다', (await 계정상태(admin, 나.아이디)).suspended, true, { blocker: true });
  });
  await test.step('두 번째 플레이어 계정으로 「게임 시작」을 누른다', async () => {
    const 화면 = await 로그인화면.열기(game);
    await 시작시도(화면, 나);
    const 창 = await 안내창읽기(game, 30_000);
    await verify('정지 안내 창이 뜬다', 창 !== null, true, { blocker: true });
    const 줄 = await verify('정지 창에 「종료 예정: 」 줄이 보인다', 창?.본문원문.includes('종료 예정: ') === true, true);
    const 표준시 = await verify('「종료 예정」 줄에 「(UTC)」가 붙는다', 창?.본문원문.includes('(UTC)') === true, true);
    const 시각 = await verify('「종료 예정」 줄에 정지가 끝나는 시각이 보인다', 창?.본문원문.includes(UTC시분글(끝)) === true, true);
    await verify('끝나는 시각이 있는 정지 계정으로 「게임 시작」을 누르면 정지 창에 「종료 예정: (UTC)」 줄이 보인다', 줄 && 표준시 && 시각, true);
  });
});
