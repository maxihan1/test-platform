import { defineCase, test, verify } from '@platform/kit';

import { 글만 } from './components/hud.component.js';
import { 원문금색인가 } from './helpers/connect.helper.js';
import { QA공지치우기, 공지만들기 } from './helpers/game-state.helper.js';
import { 로그인화면 } from './pages/login.page.js';
import { 공지띠 } from './pages/notice.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-195',
  name: '공지 띠에 「[공지] <제목> — <내용>」이 한 줄로 보이고 「[공지]」가 금색이다',
  platforms: ['android'],
  precondition: ['「[QA]」 공지가 켜져 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ game, admin }) => {
  const 제목 = '[QA] 글 모양 시험';
  const 내용 = '글 모양 본문';
  try {
    let 화면 = 로그인화면.지금(game);
    await test.step('[QA] 공지를 모두 치우고 공지를 켠 뒤 로그인 화면을 기다린다', async () => {
      await QA공지치우기(admin);
      await 공지만들기(admin, 제목, 내용);
      화면 = await 로그인화면.열기(game);
    });
    await test.step('로그인 화면을 확인한다', async () => {
      await verify('로그인 화면에 「게임 시작」 버튼이 보인다', await 화면.보이나(로그인화면.게임시작), true, { blocker: true });
    });

    await test.step('로그인 화면 공지 띠 글을 읽는다', async () => {
      await verify('공지 띠가 보인다', await 공지띠.뜰때까지(game, '글 모양 시험', 75_000), true, { blocker: true });
      const 원문 = await 공지띠.원문(game, '글 모양 시험');
      const 한줄 = await verify('공지 띠에 「[공지] <제목> — <내용>」이 한 줄로 보인다', 글만(원문) === `[공지] ${제목} — ${내용}` && !원문.includes('\n'), true);
      const 금색 = await verify('「[공지]」가 금색이다', 원문금색인가(원문, '[공지]'), true);
      await verify('공지 띠에 「[공지] <제목> — <내용>」이 한 줄로 보이고 「[공지]」가 금색이다', 한줄 && 금색, true);
    });
  } finally {
    await QA공지치우기(admin);
  }
});
