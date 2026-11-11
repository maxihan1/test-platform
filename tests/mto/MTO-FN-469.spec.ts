import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { qa_user2되돌리기 } from './helpers/account.helper.js';
import { 계정번호 } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 계정상세화면 } from './pages/account-detail.page.js';
import { 역할변경화면 } from './pages/user-role.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-469',
  name: 'qa_user2 의 역할을 「Moderator」로 저장하면 「역할이 성공적으로 변경되었습니다!」가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '조치 대상 qa_user2 가 제재 없는 상태다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 상세 = new 계정상세화면(page);
  const 역할 = new 역할변경화면(page);
  let 번호 = '';

  try {

    await test.step('Owner 계정으로 로그인하고 qa_user2 제재를 푼다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await qa_user2되돌리기(page);
    });

    await test.step('qa_user2 가 제재 없는 상태인지 확인한다', async () => {
      번호 = await 계정번호(page, 'qa_user2');
      await 상세.열기(번호);
      await verify('조치 대상 qa_user2 가 제재 없는 상태다', (await 상세.상태.innerText()).trim(), '제한 없음', { blocker: true });
    });

    await test.step('「qa_user2의 역할 변경」에서 「Moderator」를 고르고 「변경 사항을 저장」을 누른다', async () => {
      await 상세.역할변경.click();
      await 역할.그려질때까지();
      await 역할.역할바꾸기('Moderator');
      const 떴다 = await 상세.알림.글('역할이 성공적으로 변경되었습니다!').waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('qa_user2 의 역할을 「Moderator」로 저장하면 「역할이 성공적으로 변경되었습니다!」가 보인다', 떴다, true);
    });

  } finally {
    await qa_user2되돌리기(page);
  }
});
