import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 지금화면, 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 계정상태, 봇모두끄기, 제재걸기, 제재풀기 } from './helpers/game-state.helper.js';
import { 로그인화면 } from './pages/login.page.js';
import { 안내창 } from './pages/popup.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-051',
  name: '접속 중에 정지돼 서버가 내보내면 다시 연결하지 않고 안내 창을 띄운 뒤 로그인 화면으로 돌아간다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어로 로비에 들어와 있다'],
  techniques: ['동등 분할'],
  elements: ['state:제재=정지', 'state:접속=로그아웃'],
  params: z.object({
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 둘째 = 계정꺼내기(params.p2Id, params.p2Password, '두 번째 플레이어');
  let 제재번호: number | undefined;
  await test.cleanup('켜 둔 봇 끄기 · 정지 풀기 · 두 번째 플레이어 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    if (제재번호 !== undefined) await 제재풀기(admin, 제재번호);
    await 계정되돌리기(admin, 둘째);
  });
  await test.step('두 번째 플레이어로 로비에 들어간다', async () => {
    await 로비로(game, driver, 둘째);
    await verify('두 번째 플레이어로 로비에 들어와 있다', await 지금화면(game), '로비', { blocker: true });
  });
  await test.step('운영툴로 두 번째 플레이어 계정을 정지한다', async () => {
    const 정보 = await 계정상태(admin, 둘째.아이디);
    제재번호 = await 제재걸기(admin, 정보.id, 'SUSPEND', '[QA] 자동 시험 정지');
    const 창 = await 안내창.뜰때까지(game, 60_000);
    const 다시연결없음 = await verify('「다시 연결하는 중…」이 보이지 않는다', 창 !== null && !(await 창.본문에줄있나('다시 연결하는 중')), true);
    const 안내 = await verify('「이용 정지 계정」 안내 창이 보인다', 창 !== null && (await 안내창.제목이될때까지(game, '이용 정지 계정', 10_000)), true);
    if (창 !== null) await 창.확인누르기();
    const 로그인 = await verify(
      '로그인 화면으로 돌아간다',
      await 로그인화면.열기(game).then(
        () => true,
        () => false,
      ),
      true,
    );
    await verify('접속 중에 정지돼 서버가 내보내면 다시 연결하지 않고 안내 창을 띄운 뒤 로그인 화면으로 돌아간다', 다시연결없음 && 안내 && 로그인, true);
  });
});
