import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정지우기 } from './helpers/account.helper.js';
import { 고유이름 } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 가입시도, 이메일도메인차단만들기 } from './helpers/report-data.helper.js';
import { 계정목록화면 } from './pages/account-list.page.js';
import { 이메일도메인차단목록화면 } from './pages/email-domain-blocks.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-233',
  name: '「승인을 통한 가입 허용」 도메인 이메일로 가입하면 그 계정이 「대기 중」 목록에 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '케이스가 「승인을 통한 가입 허용」으로 차단한 이메일 도메인이 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 목록 = new 이메일도메인차단목록화면(page);
  const 계정목록 = new 계정목록화면(page);
  const 도메인 = 'www.maxihan.com';
  const 가입아이디 = 고유이름('mto');

  try {
    await test.step('Owner 계정으로 로그인하고 「승인을 통한 가입 허용」으로 이메일 도메인을 차단한다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 이메일도메인차단만들기(page, 도메인, true);
      await 목록.열기();
      await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 목록.제목.isVisible(), true, { blocker: true });
      await verify('케이스가 「승인을 통한 가입 허용」으로 차단한 이메일 도메인이 있다', await 목록.도메인링크(도메인).isVisible(), true, { blocker: true });
    });

    await test.step('로그아웃한 창에서 그 도메인 이메일로 가입한다', async () => {
      const 시도 = await 가입시도(page, 가입아이디, `${가입아이디}@${도메인}`);
      try {
        const 안내 = await verify('가입 뒤 이메일 확인 안내가 보인다', await 시도.화면.이메일확인안내.waitFor({ timeout: 10_000 }).then(() => true, () => false), true);
        await 계정목록.열기(`origin=local&status=pending&username=${가입아이디}`);
        const 대기 = await verify('그 아이디의 줄이 「대기 중」 목록에 보인다', await 계정목록.행(가입아이디).waitFor({ timeout: 10_000 }).then(() => true, () => false), true);
        await verify('「승인을 통한 가입 허용」 도메인 이메일로 가입하면 그 계정이 「대기 중」 목록에 보인다', 안내 && 대기, true);
      } finally {
        await 시도.창.context().close();
      }
    });
  } finally {
    try {
      await 계정지우기(page, 가입아이디);
    } finally {
      await 목록.지우기(도메인);
    }
  }
});
