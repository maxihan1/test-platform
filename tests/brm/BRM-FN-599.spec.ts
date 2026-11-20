import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인화면준비, 시작시도, 안내창읽기 } from './helpers/login-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 점검끄기, 점검켜기 } from './helpers/game-state.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-599',
  name: '점검 중에 「게임 시작」을 누르면 「서버 점검 중」 창에 운영툴에 적은 점검 안내 문구가 보인다',
  platforms: ['android'],
  precondition: ['허용 계정 없이 점검이 켜져 있다'],
  elements: ['state:점검=켜짐'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    안내문구: z.string().min(1).describe('운영툴에 적을 점검 안내 문구 — 비우지 않은 글').default('[QA] 점검 안내 시험'),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  await test.cleanup('점검 끄기', () => 점검끄기(admin));
  await test.step('로그인 화면을 열고 허용 계정 없이 점검을 켠다', async () => {
    await 로그인화면준비(game, driver);
    await 점검켜기(admin, { 안내: params.안내문구 });
    await verify('로그인 화면이 보인다', await 지금화면(game), '로그인', { blocker: true });
  });
  await test.step('일반 회원 계정으로 「게임 시작」을 누른다', async () => {
    const 화면 = await 로그인화면.열기(game);
    await 시작시도(화면, 나);
    const 창 = await 안내창읽기(game, 30_000);
    await verify('점검 안내 창이 뜬다', 창 !== null, true, { blocker: true });
    const 제목 = await verify('창 제목이 「서버 점검 중」이다', 창?.제목 ?? '', '서버 점검 중');
    const 문구 = await verify('창에 운영툴에 적은 점검 안내 문구가 보인다', 창?.본문원문.includes(params.안내문구) === true, true);
    await verify('점검 중에 「게임 시작」을 누르면 「서버 점검 중」 창에 운영툴에 적은 점검 안내 문구가 보인다', 제목 && 문구, true);
  });
});
