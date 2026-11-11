import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { type 일회용계정, 계정지우기, 상세열기, 일회용계정만들기 } from './helpers/account.helper.js';
import { 로그인하기, 새창으로로그인 } from './helpers/login.helper.js';
import { 계정상세화면 } from './pages/account-detail.page.js';
import { 계정목록화면 } from './pages/account-list.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-462',
  name: '이미 확인된 계정에 「확인 링크 다시 보내기」를 누르면 「이 사용자는 이미 확인되었습니다」가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '케이스가 만든 이메일 미확인 계정이 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 상세 = new 계정상세화면(page);
  let 계정: 일회용계정 | undefined;

  try {

    await test.step('일회용 계정을 가입시키고 Owner 계정으로 로그인한다', async () => {
      계정 = await 일회용계정만들기(page);
      await 로그인하기(page, params.loginId, params.loginPassword);
    });

    await test.step('이메일 미확인 계정 상세를 열어 확인한다', async () => {
      const 아이디 = 계정?.아이디 ?? '';
      await 상세열기(page, 아이디);
      await verify('케이스가 만든 이메일 미확인 계정이 있다', await 상세.확인링크다시보내기.isVisible(), true, { blocker: true });
    });

    await test.step('미확인일 때 연 상세 화면에서 다른 창으로 「신원 확인」을 한 뒤 「확인 링크 다시 보내기」를 누른다', async () => {
      const 아이디 = 계정?.아이디 ?? '';
      const 다른창 = await 새창으로로그인(page, params.loginId, params.loginPassword);
      try {
        await 상세열기(다른창, 아이디);
        await new 계정상세화면(다른창).신원확인.click();
        await new 계정목록화면(다른창).제목.waitFor();
      } finally {
        await 다른창.context().close();
      }
      await 상세.확인링크다시보내기.click();
      const 떴다 = await 상세.알림.글(`이 사용자는 이미 확인되었습니다`).waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('이미 확인된 계정에 「확인 링크 다시 보내기」를 누르면 「이 사용자는 이미 확인되었습니다」가 보인다', 떴다, true);
    });

  } finally {
    if (계정 !== undefined) await 계정지우기(page, 계정.아이디);
  }
});
