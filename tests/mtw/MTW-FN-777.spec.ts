import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 계정삭제화면 } from './pages/delete-account.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-777',
  name: '계정 삭제에서 틀린 암호를 넣으면 「입력한 정보가 올바르지 않습니다」가 보인다',
  precondition: ['일회용 · 계정 삭제 계정으로 로그인해 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    deleteId: z.string().describe('일회용 · 계정 삭제 계정 이메일').optional().meta({ secret: true, account: '일회용 · 계정 삭제' }),
    deletePassword: z.string().describe('일회용 · 계정 삭제 계정 암호').optional().meta({ secret: true, account: '일회용 · 계정 삭제' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 계정삭제화면(page);

  await test.step('일회용 · 계정 삭제 계정으로 로그인해 계정 삭제 화면을 연다', async () => {
    await 로그인하기(page, params.deleteId, params.deletePassword);
    await 화면.열기();
    await verify('계정 삭제 화면에 「계정 삭제」 버튼이 보인다', await 화면.삭제버튼.isVisible(), true, { blocker: true });
  });

  await test.step('계정 삭제 화면에 틀린 암호를 넣고 「계정 삭제」를 누른다', async () => {
    await 화면.틀린암호로삭제누르기('Tc-wrong-pw-9');
    const 떴다 = await 화면.오류안내.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('계정 삭제에서 틀린 암호를 넣으면 「입력한 정보가 올바르지 않습니다」가 보인다', 떴다, true);
  });
});
