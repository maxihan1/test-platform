import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-014',
  name: '없는 아이디로 로그인하면 「아이디 또는 비밀번호가 올바르지 않습니다」가 보인다',
  precondition: ['없는 아이디를 안다'],
  params: z.object({
    badId: z.string().min(1).describe('가입되어 있지 않은 아이디').default('nosuchmkt'),
    wrongPassword: z.string().min(1).describe('아무 비밀번호').default('Nope1234!').meta({ secret: true }),
  }),
  expected: z.object({
    message: z.string().describe('보여야 할 오류 문구').default('아이디 또는 비밀번호가 올바르지 않습니다'),
  }),
});

test(spec, async ({ page, params, expected }) => {
  await test.step('로그인 화면에서 없는 아이디와 아무 비밀번호로 「로그인」을 누른다', async () => {
    await page.goto('/login');
    await page.getByLabel('아이디').fill(params.badId);
    await page.getByLabel('비밀번호').fill(params.wrongPassword);
    await page.getByRole('button', { name: '로그인' }).click();
    await page.getByLabel('처리 중').waitFor({ state: 'detached' });
    await verify(
      '없는 아이디로 로그인하면 「아이디 또는 비밀번호가 올바르지 않습니다」가 보인다',
      await page.getByRole('alert').innerText(),
      expected.message,
    );
  });
});
