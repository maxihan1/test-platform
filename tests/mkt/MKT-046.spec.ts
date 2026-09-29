import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-046',
  name: '같은 아이디로 다섯 번 연속 비밀번호를 틀리면 「로그인 5회 실패로 10분간 로그인할 수 없습니다」가 보인다',
  precondition: [
    '로그인 응답은 가짜 응답(모킹)이다 — 네 번째까지는 비밀번호 틀림, 다섯 번째는 잠금 응답을 돌려준다. 실제 계정을 잠그지 않는다',
  ],
  params: z.object({
    loginId: z.string().min(1).describe('틀려 볼 아이디 — 서버에 없는 아이디여서 모킹이 풀려도 계정이 잠기지 않는다').default('xbrdlock'),
    wrongPassword: z.string().min(1).describe('틀린 비밀번호').default('Wrong000!').meta({ secret: true }),
  }),
  expected: z.object({
    badLogin: z.string().describe('네 번째까지 보일 문구').default('아이디 또는 비밀번호가 올바르지 않습니다'),
    locked: z.string().describe('다섯 번째에 보일 잠금 문구').default('로그인 5회 실패로 10분간 로그인할 수 없습니다'),
  }),
});

test(spec, async ({ page, params, expected }) => {
  let 요청수 = 0;

  const 틀린비밀번호로누른다 = async () => {
    const 응답 = page.waitForResponse('**/api/auth/login');
    await page.getByRole('button', { name: '로그인' }).click();
    await 응답;
    const 안내 = page.getByRole('alert').filter({ hasText: /\S/ });
    await 안내.waitFor();
    return (await 안내.innerText()).trim();
  };

  await test.step('로그인 요청에 가짜 응답(모킹)을 걸고 로그인 화면을 연다', async () => {
    await page.context().route('**/api/auth/login', async (route) => {
      요청수 += 1;
      await route.fulfill(
        요청수 < 5
          ? { status: 401, json: { code: 'UNAUTHORIZED', message: '아이디 또는 비밀번호가 올바르지 않습니다' } }
          : { status: 423, json: { code: 'LOCKED', message: '로그인 5회 실패로 10분간 로그인할 수 없습니다' } },
      );
    });
    await page.goto('/login');
    await page.getByLabel('아이디').fill(params.loginId);
    await page.getByLabel('비밀번호').fill(params.wrongPassword);
  });

  await test.step('같은 아이디로 틀린 비밀번호를 네 번 넣어 「로그인」을 누른다', async () => {
    let 넷째문구 = '';
    for (let 번째 = 1; 번째 <= 4; 번째 += 1) 넷째문구 = await 틀린비밀번호로누른다();
    await verify('네 번째까지는 「아이디 또는 비밀번호가 올바르지 않습니다」가 보인다', 넷째문구, expected.badLogin, { blocker: true });
  });

  await test.step('다섯 번째로 틀린 비밀번호를 넣어 「로그인」을 누른다', async () => {
    await verify(
      '같은 아이디로 다섯 번 연속 비밀번호를 틀리면 「로그인 5회 실패로 10분간 로그인할 수 없습니다」가 보인다',
      await 틀린비밀번호로누른다(),
      expected.locked,
    );
  });
});
