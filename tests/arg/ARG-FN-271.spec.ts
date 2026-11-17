import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글만 } from './components/hud.component.js';
import { 빨강인가 } from './helpers/connect.helper.js';
import { QA공지치우기, 점검끄기, 점검켜기 } from './helpers/game-state.helper.js';
import { 로그인화면 } from './pages/login.page.js';
import { 공지띠 } from './pages/notice.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-271',
  name: '점검이 걸리면 공지 띠에 「[점검] <안내>」가 빨간 바탕으로 보인다',
  held: '보류 — NoticeBar 에 Image 컴포넌트가 없습니다',
  platforms: ['android'],
  precondition: ['일반 회원을 허용 계정으로 둔 점검이 켜져 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.loginId ?? '';
  const 안내 = '자동 시험 점검 안내';
  try {
    let 화면 = 로그인화면.지금(game);
    await test.step('[QA] 공지를 모두 치우고 일반 회원을 허용 계정으로 둔 점검을 켠 뒤 로그인 화면을 기다린다', async () => {
      await QA공지치우기(admin);
      await 점검켜기(admin, 안내, { 허용아이디: [아이디] });
      화면 = await 로그인화면.열기(game);
    });
    await test.step('로그인 화면을 확인한다', async () => {
      await verify('로그인 화면에 「게임 시작」 버튼이 보인다', await 화면.보이나(로그인화면.게임시작), true, { blocker: true });
    });

    await test.step('로그인 화면 공지 띠를 확인한다', async () => {
      await verify('공지 띠가 보인다', await 공지띠.뜰때까지(game, 안내, 75_000), true, { blocker: true });
      const 원문 = await 공지띠.원문(game, 안내);
      const 문구 = await verify('공지 띠에 「[점검] <안내>」가 보인다', 글만(원문).includes(`[점검] ${안내}`), true);
      const 바탕 = await verify('공지 띠 바탕이 빨간색이다', 빨강인가(await 공지띠.배경색(game)), true);
      await verify('점검이 걸리면 공지 띠에 「[점검] <안내>」가 빨간 바탕으로 보인다', 문구 && 바탕, true);
    });
  } finally {
    await 점검끄기(admin);
  }
});
