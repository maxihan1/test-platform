import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인화면준비, 시작시도, 안내창읽기 } from './helpers/login-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정상태, 제재걸기, 제재풀기 } from './helpers/game-state.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-597',
  name: '정지된 계정으로 「게임 시작」을 누르면 「이용 정지 계정」 창에 「운영 정책에 따라 이용이 정지된 계정입니다」와 「사유: 」 줄이 보인다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어 계정이 사유를 적어 정지돼 있다'],
  elements: ['state:제재=정지'],
  params: z.object({
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    사유: z.string().min(1).describe('정지 사유 — 비우지 않은 글').default('[QA] 정지 시험'),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  let 제재번호: number | undefined;
  const 나 = 계정꺼내기(params.p2Id, params.p2Password, '두 번째 플레이어');
  await test.cleanup('두 번째 플레이어 정지 풀기', async () => {
    if (제재번호 !== undefined) await 제재풀기(admin, 제재번호);
  });
  await test.step('로그인 화면을 연다', async () => {
    await 로그인화면준비(game, driver);
    await verify('로그인 화면이 보인다', await 지금화면(game), '로그인', { blocker: true });
  });
  await test.step('두 번째 플레이어 계정에 사유를 적어 정지를 건다', async () => {
    제재번호 = await 제재걸기(admin, (await 계정상태(admin, 나.아이디)).id, 'SUSPEND', params.사유);
    await verify('두 번째 플레이어 계정이 정지돼 있다', (await 계정상태(admin, 나.아이디)).suspended, true, { blocker: true });
  });
  await test.step('두 번째 플레이어 계정으로 「게임 시작」을 누른다', async () => {
    const 화면 = await 로그인화면.열기(game);
    await 시작시도(화면, 나);
    const 창 = await 안내창읽기(game, 30_000);
    await verify('정지 안내 창이 뜬다', 창 !== null, true, { blocker: true });
    const 제목 = await verify('창 제목이 「이용 정지 계정」이다', 창?.제목 ?? '', '이용 정지 계정');
    const 안내 = await verify('창에 「운영 정책에 따라 이용이 정지된 계정입니다」가 보인다', 창?.본문원문.includes('운영 정책에 따라 이용이 정지된 계정입니다') === true, true);
    const 사유줄 = await verify('창에 「사유: 」 줄이 보인다', 창?.본문원문.includes('사유: ') === true, true);
    await verify('정지된 계정으로 「게임 시작」을 누르면 「이용 정지 계정」 창에 「운영 정책에 따라 이용이 정지된 계정입니다」와 「사유: 」 줄이 보인다', 제목 && 안내 && 사유줄, true);
  });
});
