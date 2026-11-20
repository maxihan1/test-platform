import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인화면준비, 시작시도 } from './helpers/login-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 실패걸기, 점검끄기, 점검켜기 } from './helpers/game-state.helper.js';
import { 로그인화면 } from './pages/login.page.js';
import { 안내창 } from './pages/popup.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-425',
  name: '점검 안내 문구를 못 읽으면 「서버 점검 중입니다」가 보인다',
  platforms: ['android'],
  precondition: ['점검이 켜져 있고 다음 서버 상태 읽기 요청 하나가 실패하도록 걸려 있다'],
  elements: ['state:점검=켜짐'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    안내문구: z.string().min(1).describe('점검 안내 문구 — 아무 글이나 된다').default('[QA] 점검 시험'),
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
    await 점검켜기(admin, { 안내: params.안내문구 });
    await 실패걸기(admin, '/api/serverstatus');
    await 시작시도(화면, 나);
    const 창 = await 안내창.뜰때까지(game, 30_000);
    const 본문 = 창 === null ? '' : await 창.본문();
    await verify('점검 안내 문구를 못 읽으면 「서버 점검 중입니다」가 보인다', 본문, '서버 점검 중입니다');
  });
});
