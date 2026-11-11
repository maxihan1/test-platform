import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정번호, 고유이름 } from './helpers/api.helper.js';
import { 확인창받기 } from './helpers/dialog.helper.js';
import { qa_user2에게역할주기, 역할만들기, 역할정리 } from './helpers/settings-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 계정상세화면 } from './pages/account-detail.page.js';
import { 관리화면 } from './pages/admin.page.js';
import { 역할폼화면 } from './pages/role-form.page.js';
import { 역할화면 } from './pages/roles.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-344',
  name: '케이스가 만든 역할을 삭제하면 역할 화면에서 사라지고 qa_user2 상세의 「역할」이 「할당된 역할 없음」으로 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '케이스가 만든 역할을 qa_user2 에게 줬다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 관리 = new 관리화면(page);
  const 목록 = new 역할화면(page);
  const 폼 = new 역할폼화면(page);
  const 이름 = 고유이름('mto');
  const 상세 = new 계정상세화면(page);
  let 번호 = '';

  try {
    await test.step('Owner 계정으로 로그인한다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 관리.열기('/admin/dashboard');
      await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 관리.사이드바.관리.isVisible(), true, { blocker: true });
    });

    await test.step('케이스 역할을 만들어 qa_user2 에게 준다', async () => {
      await 역할만들기(page, 이름, 5, ['대시보드 보기']);
      await qa_user2에게역할주기(page, 이름);
    });

    await test.step('케이스가 만든 역할을 qa_user2 에게 줬는지 확인한다', async () => {
      번호 = await 계정번호(page, 'qa_user2');
      await 상세.열기(번호);
      await verify('케이스가 만든 역할을 qa_user2 에게 줬다', (await 상세.역할칸.innerText()).includes(이름), true, { blocker: true });
    });

    await test.step('그 역할 수정 화면에서 「삭제」를 누르고 확인한다', async () => {
      await 목록.열기();
      await 목록.수정(이름).click();
      await 폼.삭제.waitFor();
      const 창 = 확인창받기(page, '확인');
      await 폼.삭제.click();
      await 창;
      await 목록.제목.waitFor();
      const 사라졌다 = await verify('역할 화면에서 사라진다', await 목록.카드(이름).count(), 0);
      await 상세.열기(번호);
      const 비었다 = await verify('qa_user2 상세의 「역할」이 「할당된 역할 없음」으로 보인다', (await 상세.역할칸.innerText()).trim(), '할당된 역할 없음');
      await verify('케이스가 만든 역할을 삭제하면 역할 화면에서 사라지고 qa_user2 상세의 「역할」이 「할당된 역할 없음」으로 보인다', 사라졌다 && 비었다, true);
    });
  } finally {
    await 역할정리(page, 이름);
  }
});
