import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 서버설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-283',
  name: '「서버 설명」에 200자를 적고 저장하면 「정상적으로 변경되었습니다!」가 보이고 칸에 200자가 남는다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 설정 = new 서버설정화면(page);
  let 원래 = '';
  let 바꿈 = false;

  try {
    await test.step('Owner 계정으로 로그인해 「브랜딩」 탭을 연다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 설정.열기('branding');
      원래 = await 설정.서버설명.inputValue();
      await verify('「서버 설명」 칸이 보인다', await 설정.서버설명.isVisible(), true, { blocker: true });
    });

    await test.step('「서버 설명」에 200자를 적고 저장한 뒤 원래 값으로 되돌린다', async () => {
      await 설정.서버설명.fill('가'.repeat(200));
      바꿈 = true;
      await 설정.저장하기();
      const 알림 = await verify('「정상적으로 변경되었습니다!」가 보인다', await 설정.알림.글('정상적으로 변경되었습니다!').waitFor({ timeout: 10_000 }).then(() => true, () => false), true);
      const 길이 = await verify('「서버 설명」 칸에 200자가 남는다', (await 설정.서버설명.inputValue()).length, 200);
      await 설정.서버설명.fill(원래);
      await 설정.저장하기();
      바꿈 = false;
      await verify('「서버 설명」에 200자를 적고 저장하면 「정상적으로 변경되었습니다!」가 보이고 칸에 200자가 남는다', 알림 && 길이, true);
    });
  } finally {
    if (바꿈) {
      await 설정.열기('branding');
      await 설정.서버설명.fill(원래);
      await 설정.저장하기();
    }
  }
});
