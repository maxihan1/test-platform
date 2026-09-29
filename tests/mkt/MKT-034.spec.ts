import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-034',
  name: '서버 응답을 기다리는 동안 「로그인」 버튼이 눌리지 않고 버튼 글자 대신 로딩 표시가 보인다',
  precondition: ['로그인 화면이 열려 있다', '로그인 요청의 응답은 판정이 끝날 때까지 늦춘 응답(모킹)이다'],
  params: z.object({
    badId: z.string().min(1).describe('가입되어 있지 않은 아이디').default('nosuchmkt'),
    wrongPassword: z.string().min(1).describe('아무 비밀번호').default('Nope1234!').meta({ secret: true }),
  }),
  expected: z.object({
    disabled: z.boolean().describe('기다리는 동안 버튼이 막혀 있을지 여부').default(true),
    label: z.string().describe('기다리는 동안 버튼 글자').default(''),
    loadingVisible: z.boolean().describe('기다리는 동안 로딩 표시가 보일지 여부').default(true),
  }),
});

test(spec, async ({ page, params, expected }) => {
  await test.step('아이디와 비밀번호를 넣고 「로그인」을 누른다', async () => {
    let 풀기: () => void = () => {};
    const 풀림 = new Promise<void>((resolve) => {
      풀기 = resolve;
    });
    await page.context().route('**/api/auth/login', async (route) => {
      await 풀림;
      await route.continue();
    });
    await page.goto('/login');
    await page.getByLabel('아이디').fill(params.badId);
    await page.getByLabel('비밀번호').fill(params.wrongPassword);
    const 버튼 = page.getByRole('main').getByRole('button');
    const 요청 = page.waitForRequest('**/api/auth/login');
    await 버튼.click();
    await 요청;
    await verify(
      '서버 응답을 기다리는 동안 「로그인」 버튼이 눌리지 않고 버튼 글자 대신 로딩 표시가 보인다',
      {
        막힘: await 버튼.isDisabled(),
        글자: (await 버튼.innerText()).trim(),
        로딩표시: await 버튼.getByLabel('처리 중').isVisible(),
      },
      { 막힘: expected.disabled, 글자: expected.label, 로딩표시: expected.loadingVisible },
    );
    const 응답 = page.waitForResponse('**/api/auth/login');
    풀기();
    await 응답;
  });
});
