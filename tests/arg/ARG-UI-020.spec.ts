import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 자리가맞나 } from './helpers/connect.helper.js';
import { 로그인화면 } from './pages/login.page.js';
import { 접속안내창 } from './pages/notice.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-020',
  name: '접속 안내 창이 화면 가운데에 「확인」 버튼 하나와 함께 보인다',
  platforms: ['android'],
  precondition: ['없는 아이디로 로그인해 접속 안내 창이 떠 있다'],
  params: z.object({
    없는아이디: z.string().describe('서버에 없는 아이디 — 계정에 없는 이름이면 같은 결과').default('qa_nobody_probe'),
    틀린비밀번호: z.string().describe('아무 비밀번호 — 어떤 글자여도 같은 결과').default('wrong-pass-1'),
  }),
  expected: null,
});

test(spec, async ({ game, params }) => {
  let 화면 = 로그인화면.지금(game);
  await test.step('없는 아이디로 로그인해 접속 안내 창을 띄운다', async () => {
    화면 = await 로그인화면.열기(game);
    await 화면.로그인(params.없는아이디, params.틀린비밀번호);
  });
  await test.step('접속 안내 창을 확인한다', async () => {
    const 창 = await 접속안내창.뜰때까지(game);
    await verify('접속 안내 창이 보인다', 창 !== null, true, { blocker: true });
    const 확인 = await verify('창에 「확인」 버튼이 보인다', (await 창?.확인보이나()) ?? false, true);
    const 가운데 = await verify('창이 화면 가운데에 있다', await 자리가맞나(game, 접속안내창.창, '가운데', '가운데'), true);
    const 배치 = await verify('창의 누를 수 있는 것이 화면 안에 있고 서로 겹치지 않는다', (await game.layout(접속안내창.창)).problems, []);
    await verify('접속 안내 창이 화면 가운데에 「확인」 버튼 하나와 함께 보인다', 확인 && 가운데 && 배치, true);
  });
});
