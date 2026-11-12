import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { qa_user2되돌리기 } from './helpers/account.helper.js';
import { 계정번호 } from './helpers/api.helper.js';
import { Owner창으로정리하기 } from './helpers/cleanup.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 계정상세화면 } from './pages/account-detail.page.js';
import { 공개프로필화면 } from './pages/settings-profile.page.js';
import { 역할변경화면 } from './pages/user-role.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-540',
  name: 'Admin 이 qa_user2 에게 자기보다 높은 「Owner」 역할을 선택해 저장하면 「당신의 현재 역할보다 높을 수 없습니다」가 보인다',
  precondition: ['Admin 역할 계정으로 로그인해 있다'],
  params: z.object({
    adminId: z.string().describe('Admin 역할 아이디').optional().meta({ secret: true, account: 'Admin' }),
    adminPassword: z.string().describe('Admin 역할 비밀번호').optional().meta({ secret: true, account: 'Admin' }),
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 프로필 = new 공개프로필화면(page);
  const 상세 = new 계정상세화면(page);
  const 변경 = new 역할변경화면(page);
  let 번호 = '';
  let 되돌릴것 = false;

  try {
    await test.step('Admin 역할 계정으로 로그인한다', async () => {
      await 로그인하기(page, params.adminId, params.adminPassword);
      await 프로필.열기();
      await verify('Admin 역할 계정으로 로그인해 있다', await 프로필.로그아웃.waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
    });
    await test.step('qa_user2 의 「역할 변경」 화면에서 「Owner」를 선택하고 「변경 사항을 저장」을 누른다', async () => {
      번호 = await 계정번호(page, 'qa_user2');
      await 상세.열기(번호);
      await 상세.역할변경.click();
      await 변경.그려질때까지();
      되돌릴것 = true;
      await 변경.역할바꾸기('Owner');
      const 막힘 = await verify('Admin 이 qa_user2 에게 자기보다 높은 「Owner」 역할을 선택해 저장하면 「당신의 현재 역할보다 높을 수 없습니다」가 보인다', await 변경.우선순위초과오류.waitFor({ timeout: 10_000 }).then(() => true, () => false), true);
      되돌릴것 = !막힘;
    });
    await test.step('저장한 뒤 qa_user2 의 계정 상세를 다시 연다', async () => {
      await 상세.열기(번호);
      const 오너가됨 = (await 상세.역할칸.innerText()).includes('Owner');
      되돌릴것 = 오너가됨;
      await verify('qa_user2 의 역할이 「Owner」로 변경되지 않는다', 오너가됨, false);
    });
  } finally {
    if (되돌릴것) await Owner창으로정리하기(page, params.loginId, params.loginPassword, (Owner창) => qa_user2되돌리기(Owner창));
  }
});
