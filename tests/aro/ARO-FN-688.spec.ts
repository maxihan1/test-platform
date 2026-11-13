import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 기록화면 } from './pages/logs.page.js';
import { 대시보드화면 } from './pages/dashboard.page.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-688',
  name: '없는 아이디로 로그인에 실패하면 「기록」에 그 아이디의 줄이 없다',
  precondition: ['로그인하지 않았다', '운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 로그인 = new 로그인화면(page);
  const 대시보드 = new 대시보드화면(page);
  const 기록 = new 기록화면(page);
  const 없는아이디 = `zz없는아이디${String(Date.now())}`;

  await test.step('로그인 화면을 연다', async () => {
    await 로그인.열기();
    await verify('로그인 화면에 「로그인」 버튼이 보인다', await 로그인.로그인버튼.isVisible(), true, { blocker: true });
  });

  await test.step('없는 아이디로 로그인에 실패한 뒤 「기록」에서 그 아이디로 찾는다', async () => {
    await 로그인.로그인(없는아이디, '틀린비밀번호1!');
    const 오류 = await 로그인.오류뜰때까지();
    await verify('로그인 오류 문구가 보인다', 오류 !== null, true, { blocker: true });
    await 운영자쿠키받기(page, params.loginId, params.loginPassword);
    await 기록.열기();
    await verify('「기록」 표에 줄이 보인다', (await 기록.줄들.count()) > 0, true, { blocker: true });
    await 기록.검색(없는아이디);
    await verify('없는 아이디로 로그인에 실패하면 「기록」에 그 아이디의 줄이 없다', await 기록.줄들.count(), 0);
  });

  await test.step('로그아웃한 뒤 다시 로그인해 「기록」에서 「LOGOUT」으로 찾는다', async () => {
    await 기록.열기();
    await 기록.틀.로그아웃누르기();
    const 열렸다 = await 기록.창.열릴때까지();
    await verify('로그아웃 확인 창이 열린다', 열렸다, true, { blocker: true });
    await 기록.창.누르기('확인');
    await 로그인.그려질때까지();
    await verify('로그인 화면이 보인다', await 로그인.로그인버튼.isVisible(), true, { blocker: true });
    await 로그인.로그인(params.loginId ?? '', params.loginPassword ?? '');
    await 대시보드.제목.waitFor();
    await 기록.열기();
    await verify('「기록」 표에 줄이 보인다', (await 기록.줄들.count()) > 0, true, { blocker: true });
    const 첫쪽에서 = await verify('「기록」 첫 쪽의 「작업」 칸에 LOGOUT 이 없다', (await 기록.칸들('작업').allInnerTexts()).filter((글) => 글.trim() === 'LOGOUT').length, 0);
    await 기록.검색('LOGOUT');
    const 찾아서 = await verify('「LOGOUT」으로 찾은 줄이 없다', await 기록.줄들.count(), 0);
    await verify('로그아웃은 「기록」에 줄을 남기지 않는다', 첫쪽에서 && 찾아서, true);
  });
});
