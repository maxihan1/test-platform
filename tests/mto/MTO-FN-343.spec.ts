import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유이름 } from './helpers/api.helper.js';
import { Owner창으로정리하기 } from './helpers/cleanup.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 역할정리 } from './helpers/settings-data.helper.js';
import { 역할폼화면 } from './pages/role-form.page.js';
import { 역할화면 } from './pages/roles.page.js';
import { 공개프로필화면 } from './pages/settings-profile.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-343',
  name: 'Admin 이 자기 역할의 우선순위를 변경해 저장하면 「당신의 현재 역할을 변경할 수 없습니다」가 보인다',
  precondition: ['Admin 역할 계정으로 로그인해 있다'],
  techniques: ['동등 분할'],
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
  const 역할 = new 역할화면(page);
  const 폼 = new 역할폼화면(page);
  const 새역할이름 = 고유이름('mto');
  let 추가시도 = false;

  try {
    await test.step('Admin 역할 계정으로 로그인한다', async () => {
      await 로그인하기(page, params.adminId, params.adminPassword);
      await 프로필.열기();
      await verify('Admin 역할 계정으로 로그인해 있다', await 프로필.로그아웃.waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
    });
    await test.step('자기 역할 「Admin」 수정 화면에 우선순위 값을 실어 「변경 사항을 저장」을 누른다', async () => {
      await 역할.열기();
      await 역할.수정('Admin').click();
      await 폼.우선순위실어저장하기(99);
      await verify('Admin 이 자기 역할의 우선순위를 변경해 저장하면 「당신의 현재 역할을 변경할 수 없습니다」가 보인다', await 폼.자기역할변경오류.waitFor({ timeout: 10_000 }).then(() => true, () => false), true);
    });
    await test.step('「역할 추가」 화면에서 막힌 「관리자」 권한을 켜고 「역할 추가」를 누른다', async () => {
      await 폼.추가폼열기();
      추가시도 = true;
      await 폼.막힌권한켜고추가하기(새역할이름, '관리자');
      await verify('자기에게 없는 「관리자」 권한을 넣은 역할 폼에 「당신의 현재 역할이 가지고 있지 않은 권한은 포함할 수 없습니다」가 보인다', await 폼.가진권한초과오류.waitFor({ timeout: 10_000 }).then(() => true, () => false), true);
    });
  } finally {
    if (추가시도) await Owner창으로정리하기(page, params.loginId, params.loginPassword, (Owner창) => 역할정리(Owner창, 새역할이름));
  }
});
