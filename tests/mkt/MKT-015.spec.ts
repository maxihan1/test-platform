import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-015',
  name: '아이디·비밀번호 칸이 비어 있으면 「로그인」 버튼이 눌리지 않는다',
  precondition: ['로그인 화면이 열려 있다'],
  params: z.object({
    anyId: z.string().min(1).describe('한 번 채워 볼 아이디').default('someone'),
  }),
  expected: z.object({
    disabled: z.boolean().describe('빈 칸일 때 「로그인」 버튼이 눌리지 않을지 여부').default(true),
  }),
});

test(spec, async ({ page, params, expected }) => {
  await test.step('아이디·비밀번호 칸을 채웠다가 비운다', async () => {
    await page.goto('/login');
    const 버튼 = page.getByRole('button', { name: '로그인' });
    await 버튼.waitFor();
    await page.getByLabel('아이디').fill(params.anyId);
    await page.getByLabel('아이디').fill('');
    await page.getByLabel('비밀번호').fill('');
    await verify('아이디·비밀번호 칸이 비어 있으면 「로그인」 버튼이 눌리지 않는다', await 버튼.isDisabled(), expected.disabled);
  });
});
