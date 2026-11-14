import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 표식 } from './helpers/page-setup.helper.js';
import { 암호와보안화면 } from './pages/auth-settings.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-796',
  name: '이메일을 바꿔 저장하면 확인 전까지 이메일 칸에 기존 주소가 남는다',
  precondition: ['일회용 · 이메일 변경 계정으로 로그인해 있다'],
  params: z.object({
    mailId: z.string().describe('일회용 · 이메일 변경 계정 이메일').optional().meta({ secret: true, account: '일회용 · 이메일 변경' }),
    mailPassword: z.string().describe('일회용 · 이메일 변경 계정 암호').optional().meta({ secret: true, account: '일회용 · 이메일 변경' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 설정 = new 암호와보안화면(page);
  const 암호 = params.mailPassword ?? '';
  let 원래이메일 = '';
  let 바꿈 = false;

  await test.step('일회용 · 이메일 변경 계정으로 로그인해 암호 및 보안을 연다', async () => {
    await 로그인하기(page, params.mailId, params.mailPassword);
    await 설정.열기();
    원래이메일 = await 설정.이메일칸.inputValue();
    await verify('암호 및 보안 화면에 「변경 사항을 저장」이 보인다', await 설정.틀.저장.isVisible(), true, { blocker: true });
  });

  try {
    await test.step('암호 및 보안에서 새 이메일과 현재 암호를 넣고 저장한다', async () => {
      바꿈 = true;
      await 설정.이메일바꾸고저장(`tc-${표식('chg')}@maxihan.com`, 암호);
      const 안내 = await 설정.확인대기안내.waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('이메일을 바꿔 저장하면 확인 전까지 이메일 칸에 기존 주소가 남는다', await 설정.이메일칸.inputValue(), 원래이메일);
      await verify('새 주소 확인이 필요하다는 안내가 보인다', 안내, true);
    });
  } finally {
    if (바꿈) {
      await 설정.열기();
      await 설정.이메일바꾸고저장(원래이메일, 암호);
      await 설정.틀.성공안내.waitFor();
    }
  }
});
