import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 암호와보안화면 } from './pages/auth-settings.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-690',
  name: '설정 저장에 오류가 있으면 「오류가 발생했습니다. 아래 1개 오류를 확인해 주십시오」와 칸 오류가 보인다',
  precondition: ['두 번째 사용자로 로그인해 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    secondId: z.string().describe('두 번째 사용자 이메일').optional().meta({ secret: true, account: '두 번째 사용자' }),
    secondPassword: z.string().describe('두 번째 사용자 암호').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 설정 = new 암호와보안화면(page);

  await test.step('두 번째 사용자로 로그인해 암호 및 보안을 연다', async () => {
    await 로그인하기(page, params.secondId, params.secondPassword);
    await 설정.열기();
    await verify('암호 및 보안 화면에 「변경 사항을 저장」이 보인다', await 설정.틀.저장.isVisible(), true, { blocker: true });
  });

  await test.step('암호 및 보안에서 현재 암호를 틀리게 넣고 「변경 사항을 저장」을 누른다', async () => {
    await 설정.현재암호칸.fill('Tc-wrong-pw-9');
    await 설정.저장하기();
    const 요약 = await verify(
      '「오류가 발생했습니다. 아래 1개 오류를 확인해 주십시오」가 보인다',
      await 설정.오류요약.waitFor({ timeout: 10_000 }).then(() => true, () => false),
      true,
    );
    const 칸오류 = await verify('칸 오류가 보인다', await 설정.칸오류.isVisible(), true);
    await verify('설정 저장에 오류가 있으면 「오류가 발생했습니다. 아래 1개 오류를 확인해 주십시오」와 칸 오류가 보인다', 요약 && 칸오류, true);
  });
});
