import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 공지화면 } from './pages/notices.page.js';

export const spec = defineCase({
  tcId: 'ARO-UI-018',
  name: '「새 공지」 창에서 오른쪽 위 ×를 누르면 창이 닫힌다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 공지화면(page);

  await test.step('운영자 계정으로 로그인하고 「공지」 화면을 연다', async () => {
    await 운영자쿠키받기(page, params.loginId, params.loginPassword);
    await 화면.열기();
    await verify('「새 공지」 버튼이 보인다', await 화면.새공지버튼.isVisible(), true, { blocker: true });
  });

  await test.step('「새 공지」 창을 열고 오른쪽 위 ×를 누른다', async () => {
    const 열렸다 = await 화면.새공지열기();
    await verify('「새 공지」 창이 열린다', 열렸다, true, { blocker: true });
    await 화면.창.엑스누르기();
    const 닫혔다 = await 화면.창.닫힐때까지();
    await verify('「새 공지」 창에서 오른쪽 위 ×를 누르면 창이 닫힌다', 닫혔다, true);
  });

  await test.step('「새 공지」 창을 열고 창 바깥을 누른다', async () => {
    const 열렸다 = await 화면.새공지열기();
    await verify('「새 공지」 창이 열린다', 열렸다, true, { blocker: true });
    await 화면.창.바깥누르기();
    const 닫혔다 = await 화면.창.닫힐때까지();
    await verify('창 바깥 클릭으로도 창이 닫힌다', 닫혔다, true);
  });

  await test.step('「새 공지」 창을 열고 Esc 를 친다', async () => {
    const 열렸다 = await 화면.새공지열기();
    await verify('「새 공지」 창이 열린다', 열렸다, true, { blocker: true });
    await 화면.창.Esc치기();
    const 닫혔다 = await 화면.창.닫힐때까지();
    await verify('Esc 로도 창이 닫힌다', 닫혔다, true);
  });

  await test.step('「새 공지」 창을 열고 「닫기」를 누른다', async () => {
    const 열렸다 = await 화면.새공지열기();
    await verify('「새 공지」 창이 열린다', 열렸다, true, { blocker: true });
    await 화면.창.누르기('닫기');
    const 닫혔다 = await 화면.창.닫힐때까지();
    await verify('「닫기」 버튼으로도 창이 닫힌다', 닫혔다, true);
  });
});
