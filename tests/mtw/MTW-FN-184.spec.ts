import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 한국어로, 새창열기 } from './helpers/page-setup.helper.js';
import { 가입하기, 새계정값 } from './helpers/signup.helper.js';
import { 로그인화면 } from './pages/sign-in.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-184',
  name: '있는 이메일에 틀린 암호로 로그인하면 없는 이메일로 로그인할 때와 같은 안내가 보인다',
  precondition: ['가입만 하고 확인하지 않은 새 계정이 있다'],
  params: z.object({
    없는이메일: z.string().min(1).describe('가입하지 않은 이메일 — 이 서버에 없는 주소').default('tc-nobody-1@maxihan.com'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 로그인 = new 로그인화면(page);
  const 값 = 새계정값();

  await test.step('가입만 하고 확인하지 않은 새 계정을 만든다', async () => {
    const 가입창 = await 새창열기(page);
    try {
      await 가입하기(가입창.page, 값);
    } finally {
      await 가입창.창묶음.close();
    }
    await 한국어로(page);
    await 로그인.열기();
    await verify('로그인 화면에 「로그인」 버튼이 보인다', await 로그인.로그인버튼.isVisible(), true, { blocker: true });
  });

  await test.step('새 계정 이메일에 틀린 암호를 넣고 로그인한 뒤 없는 이메일로도 로그인한다', async () => {
    const 있는이메일안내 = await 로그인.로그인실패안내읽기(값.이메일, `${값.암호}x`);
    const 없는이메일안내 = await 로그인.로그인실패안내읽기(params.없는이메일, `${값.암호}x`);
    await verify(
      '있는 이메일에 틀린 암호로 로그인하면 없는 이메일로 로그인할 때와 같은 안내가 보인다',
      있는이메일안내 !== '' && 있는이메일안내 === 없는이메일안내,
      true,
    );
  });
});
