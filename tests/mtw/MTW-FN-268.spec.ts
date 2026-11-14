import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 확인링크재전송화면 } from './pages/confirmation.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-268',
  name: '확인 링크 다시 보내기 화면에 없는 이메일을 넣고 보내면 「이메일 주소가 저희 데이터베이스에 있는 경우, 몇 분 내에」로 시작하는 안내가 보인다',
  precondition: ['비회원이다'],
  params: z.object({
    없는이메일: z.string().min(1).describe('가입하지 않은 이메일 — 이 서버에 없는 주소').default('tc-nobody-2@maxihan.com'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 확인링크재전송화면(page);

  await test.step('확인 링크 다시 보내기 화면을 연다', async () => {
    await 한국어로(page);
    await 화면.열기();
    await verify('확인 링크 다시 보내기 화면에 「확인 링크 다시 보내기」 버튼이 보인다', await 화면.보내기.isVisible(), true, { blocker: true });
  });

  await test.step('확인 링크 다시 보내기 화면에 없는 이메일을 넣고 「확인 링크 다시 보내기」를 누른다', async () => {
    await 화면.보내기누르기(params.없는이메일);
    await 화면.결과안내.waitFor();
    await verify(
      '확인 링크 다시 보내기 화면에 없는 이메일을 넣고 보내면 「이메일 주소가 저희 데이터베이스에 있는 경우, 몇 분 내에」로 시작하는 안내가 보인다',
      (await 화면.결과안내.innerText()).trim().startsWith('이메일 주소가 저희 데이터베이스에 있는 경우, 몇 분 내에'),
      true,
    );
  });
});
