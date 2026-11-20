import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 지금화면, 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 봇모두끄기, 접속끊기 } from './helpers/game-state.helper.js';
import { 안내창 } from './pages/popup.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-604',
  name: '서버가 게임을 닫으면 「연결 끊김」 창에 「서버가 게임을 종료했습니다」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  elements: ['state:장소=로비'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  await test.cleanup('켜 둔 봇 끄기', () => 봇모두끄기(admin));
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    await 로비로(game, driver, 나);
    await verify('일반 회원으로 로비에 들어와 있다', await 지금화면(game), '로비', { blocker: true });
  });
  await test.step('시험 주소로 일반 회원의 접속을 끊는다', async () => {
    await 접속끊기(admin, 나.아이디);
    const 창 = await 안내창.뜰때까지(game, 30_000);
    const 제목 = await verify('「연결 끊김」 창이 보인다', 창 !== null && (await 안내창.제목이될때까지(game, '연결 끊김', 10_000)), true);
    const 본문 = await verify('「서버가 게임을 종료했습니다」가 보인다', 창 !== null && (await 창.본문이될때까지('서버가 게임을 종료했습니다', 10_000)), true);
    await verify('서버가 게임을 닫으면 「연결 끊김」 창에 「서버가 게임을 종료했습니다」가 보인다', 제목 && 본문, true);
  });
});
