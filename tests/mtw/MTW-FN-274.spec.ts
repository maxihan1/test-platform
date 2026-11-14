import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 암호재설정화면 } from './pages/password-reset.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-274',
  name: '암호 재설정에 없는 이메일을 넣어도 「이 이메일을 받지 못했다면 스팸 폴더를 확인해 주세요.」로 끝나는 안내가 보인다',
  precondition: ['비회원이다'],
  params: z.object({
    없는이메일: z.string().min(1).describe('가입하지 않은 이메일 — 이 서버에 없는 주소').default('tc-nobody-3@maxihan.com'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 암호재설정화면(page);

  await test.step('암호 재설정 화면을 연다', async () => {
    await 한국어로(page);
    await 화면.열기();
    await verify('암호 재설정 화면에 「암호 재설정」 버튼이 보인다', await 화면.보내기.isVisible(), true, { blocker: true });
  });

  await test.step('암호 재설정 화면에 없는 이메일을 넣고 「암호 재설정」을 누른다', async () => {
    await 화면.보내기누르기(params.없는이메일);
    await 화면.결과안내.waitFor();
    await verify(
      '암호 재설정에 없는 이메일을 넣어도 「이 이메일을 받지 못했다면 스팸 폴더를 확인해 주세요.」로 끝나는 안내가 보인다',
      (await 화면.결과안내.innerText()).trim().endsWith('이 이메일을 받지 못했다면 스팸 폴더를 확인해 주세요.'),
      true,
    );
  });
});
