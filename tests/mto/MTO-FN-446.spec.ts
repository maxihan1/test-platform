import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { qa_user2되돌리기 } from './helpers/account.helper.js';
import { 계정번호, 고유이름 } from './helpers/api.helper.js';
import { 참고사항지우기 } from './helpers/account-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 계정상세화면 } from './pages/account-detail.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-446',
  name: '참고사항 2,000자를 남기면 「중재 참고사항을 만들었습니다!」가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '조치 대상 qa_user2 가 제재 없는 상태다'],
  techniques: ['경계값 분석'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 상세 = new 계정상세화면(page);
  let 번호 = '';
  let 글 = '';

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

    await test.step('qa_user2 계정 상세 참고사항에 2,000자를 적고 「참고사항 남기기」를 누른다', async () => {
      const 머리 = `MTO 시험 ${고유이름('n')} `;
      글 = 머리 + '가'.repeat(2000 - 머리.length);
      await 상세.참고사항적기(글);
      const 떴다 = await 상세.알림.글('중재 참고사항을 만들었습니다!').waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('참고사항 2,000자를 남기면 「중재 참고사항을 만들었습니다!」가 보인다', 떴다, true);
    });
  } finally {
    if (번호 && 글) await 참고사항지우기(page, 번호, 글.slice(0, 30));
  }
});
