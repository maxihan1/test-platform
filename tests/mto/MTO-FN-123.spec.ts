import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { type 일회용계정, 계정지우기, 상세열기, 승인대기계정만들기 } from './helpers/account.helper.js';
import { 확인창받기 } from './helpers/dialog.helper.js';
import { 대기계정상세열기 } from './helpers/account-data.helper.js';
import { 로그인하기, 새창 } from './helpers/login.helper.js';
import { 계정상세화면 } from './pages/account-detail.page.js';
import { 계정목록화면 } from './pages/account-list.page.js';
import { 로그인화면 } from './pages/sign-in.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-123',
  name: '허가한 계정으로 로그인하면 로그인 화면을 벗어난다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '케이스가 만든 승인 대기 계정이 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 상세 = new 계정상세화면(page);
  const 목록 = new 계정목록화면(page);
  let 계정: 일회용계정 | undefined;

  try {

    await test.step('Owner 계정으로 로그인하고 승인 대기 계정을 만든다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      계정 = await 승인대기계정만들기(page);
    });

    await test.step('승인 대기 계정 상세를 열어 확인한다', async () => {
      const 아이디 = 계정?.아이디 ?? '';
      await 대기계정상세열기(page, 아이디);
      await verify('케이스가 만든 승인 대기 계정이 있다', await 상세.허가.isVisible(), true, { blocker: true });
    });

    await test.step('그 계정을 허가하고 신원 확인한 뒤 그 계정으로 로그인한다', async () => {
      const 아이디 = 계정?.아이디 ?? '';
      const 이메일 = 계정?.이메일 ?? '';
      const 암호 = 계정?.암호 ?? '';
      const 창 = 확인창받기(page, '확인');
      await 상세.허가.click();
      await 창;
      await 상세.알림.글('승인했습니다').waitFor();
      await 상세열기(page, 아이디);
      await 상세.신원확인.click();
      await 목록.제목.waitFor();
      const 로그인창 = await 새창(page);
      try {
        const 로그인 = new 로그인화면(로그인창);
        await 로그인.열기();
        await 로그인.이메일.fill(이메일);
        await 로그인.암호.fill(암호);
        await 로그인.로그인버튼.click();
        const 벗어남 = await 로그인창.waitForURL((주소) => !주소.pathname.startsWith(로그인화면.주소), { timeout: 10_000 }).then(() => true, () => false);
        await verify('허가한 계정으로 로그인하면 로그인 화면을 벗어난다', 벗어남, true);
      } finally {
        await 로그인창.context().close();
      }
    });

  } finally {
    if (계정 !== undefined) await 계정지우기(page, 계정.아이디);
  }
});
