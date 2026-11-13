import { defineCase, test, verify } from '@platform/kit';

import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-058',
  name: '로그인 응답이 늦을 때 「로그인」을 누르면 응답을 기다리는 동안 「로그인」 버튼이 눌리지 않는다',
  precondition: ['로그인 응답은 늦춘 응답이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 로그인 = new 로그인화면(page);
  let 놓기: () => void = () => undefined;
  let 도착: () => void = () => undefined;
  const 붙잡힘 = new Promise<void>((풀림) => {
    놓기 = 풀림;
  });
  const 요청도착 = new Promise<void>((풀림) => {
    도착 = 풀림;
  });

  try {
    await test.step('로그인 화면을 열고 로그인 응답을 늦춘다', async () => {
      await page.context().route('**/api/login', async (route) => {
        도착();
        await 붙잡힘;
        await route.continue();
      });
      await verify('로그인 화면이 열려 있다', await 로그인.열렸나(), true, { blocker: true });
    });

    await test.step('아이디와 비밀번호를 적고 「로그인」을 누른다', async () => {
      await 로그인.로그인('zz_no_user_' + String(Date.now()), '시험용 비밀번호');
      await 요청도착;
      await verify('로그인 응답이 늦을 때 「로그인」을 누르면 응답을 기다리는 동안 「로그인」 버튼이 눌리지 않는다', await 로그인.제출버튼.isDisabled(), true);
    });
  } finally {
    놓기();
    await 로그인.오류뜰때까지();
    await page.context().unroute('**/api/login');
  }
});
