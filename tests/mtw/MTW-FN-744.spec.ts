import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 표식 } from './helpers/page-setup.helper.js';
import { 암호와보안화면 } from './pages/auth-settings.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-744',
  name: '현재 암호를 틀리게 넣고 저장하면 이메일 주소가 바뀌지 않는다',
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
  let 원래이메일 = '';

  await test.step('두 번째 사용자로 로그인해 암호 및 보안을 연다', async () => {
    await 로그인하기(page, params.secondId, params.secondPassword);
    await 설정.열기();
    원래이메일 = await 설정.이메일칸.inputValue();
    await verify('암호 및 보안 화면에 「변경 사항을 저장」이 보인다', await 설정.틀.저장.isVisible(), true, { blocker: true });
  });

  await test.step('암호 및 보안에서 이메일을 바꾸고 현재 암호를 틀리게 넣어 저장한다', async () => {
    await 설정.이메일바꾸고저장(`tc-${표식('mail')}@maxihan.com`, 'Tc-wrong-pw-9');
    await 설정.오류요약.waitFor();
    await 설정.열기();
    await verify('현재 암호를 틀리게 넣고 저장하면 이메일 주소가 바뀌지 않는다', await 설정.이메일칸.inputValue(), 원래이메일);
  });
});
