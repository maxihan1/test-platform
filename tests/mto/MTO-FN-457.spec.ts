import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유이름 } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 대시보드화면 } from './pages/dashboard.page.js';
import { 서버규칙화면 } from './pages/rules.page.js';
import { 공개프로필화면 } from './pages/settings-profile.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-457',
  name: '서버 규칙이 하나도 없을 때 대시보드를 열면 「아직 서버 규칙을 정하지 않았습니다.」와 「서버 규칙 관리」 링크가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '서버 규칙이 하나도 없다'],
  techniques: ['경계값 분석'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 프로필 = new 공개프로필화면(page);
  const 대시보드 = new 대시보드화면(page);
  const 서버규칙 = new 서버규칙화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 프로필.열기();
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 프로필.로그아웃.waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });
  await test.step('서버 규칙이 하나도 없는지 확인한다', async () => {
    await 서버규칙.열기();
    await verify('서버 규칙이 하나도 없다', await 서버규칙.빈목록.isVisible(), true, { blocker: true });
  });
  await test.step('「대시보드」 화면을 연다', async () => {
    await 대시보드.열기();
    const 경고 = await verify('「아직 서버 규칙을 정하지 않았습니다.」가 보인다', await 대시보드.규칙경고.isVisible(), true);
    const 링크 = await verify('「서버 규칙 관리」 링크가 보인다', await 대시보드.규칙관리링크.isVisible(), true);
    await verify('서버 규칙이 하나도 없을 때 대시보드를 열면 「아직 서버 규칙을 정하지 않았습니다.」와 「서버 규칙 관리」 링크가 보인다', 경고 && 링크, true);
  });
  const 규칙글 = 고유이름('mto');
  try {
    await test.step('서버 규칙을 하나 더한 뒤 「대시보드」 화면을 연다', async () => {
      await 서버규칙.규칙더하기(규칙글);
      await 대시보드.열기();
      await verify('서버 규칙이 하나 있는 대시보드에는 「아직 서버 규칙을 정하지 않았습니다.」가 보이지 않는다', await 대시보드.규칙경고.isVisible(), false);
    });
  } finally {
    await 서버규칙.규칙지우기(규칙글);
  }
});
