import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인화면준비, 시작시도, 안내창읽기 } from './helpers/login-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정상태, 제재걸기, 제재풀기, 점검끄기, 점검켜기 } from './helpers/game-state.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-601',
  name: '정지와 점검이 같이 걸린 계정으로 「게임 시작」을 누르면 「이용 정지 계정」 창이 보인다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어 계정이 정지돼 있고 점검이 켜져 있다'],
  elements: ['state:제재=정지', 'state:점검=켜짐'],
  params: z.object({
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  let 제재번호: number | undefined;
  const 나 = 계정꺼내기(params.p2Id, params.p2Password, '두 번째 플레이어');
  await test.cleanup('점검 끄기 · 두 번째 플레이어 정지 풀기', async () => {
    await 점검끄기(admin);
    if (제재번호 !== undefined) await 제재풀기(admin, 제재번호);
  });
  await test.step('로그인 화면을 연다', async () => {
    await 로그인화면준비(game, driver);
    await verify('로그인 화면이 보인다', await 지금화면(game), '로그인', { blocker: true });
  });
  await test.step('두 번째 플레이어 계정을 정지하고 점검을 켠다', async () => {
    제재번호 = await 제재걸기(admin, (await 계정상태(admin, 나.아이디)).id, 'SUSPEND', '[QA] 정지와 점검 시험');
    await 점검켜기(admin, { 안내: '[QA] 정지와 점검 시험' });
    await verify('두 번째 플레이어 계정이 정지돼 있다', (await 계정상태(admin, 나.아이디)).suspended, true, { blocker: true });
  });
  await test.step('두 번째 플레이어 계정으로 「게임 시작」을 누른다', async () => {
    const 화면 = await 로그인화면.열기(game);
    await 시작시도(화면, 나);
    const 창 = await 안내창읽기(game, 30_000);
    await verify('접속 안내 창이 뜬다', 창 !== null, true, { blocker: true });
    await verify('정지와 점검이 같이 걸린 계정으로 「게임 시작」을 누르면 「이용 정지 계정」 창이 보인다', 창?.제목 ?? '', '이용 정지 계정');
  });
});
