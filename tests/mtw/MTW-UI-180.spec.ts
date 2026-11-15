import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정찾기API } from './helpers/api.helper.js';
import { 관계API, 메모바꾸기API } from './helpers/account-api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 표식 } from './helpers/page-setup.helper.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-180',
  name: '개인 메모를 남긴 hana_photo 프로필에 「개인 메모 (나에게만 보입니다)」가 보인다',
  precondition: ['일반 회원으로 로그인해 있다', 'hana_photo 에 개인 메모를 남겨 두었다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 프로필 = new 프로필화면(page);
  let 대상id = '';
  let 원래메모 = '';

  try {
    await test.step('일반 회원으로 로그인하고 hana_photo 에 개인 메모를 남긴다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 프로필.메뉴.그려질때까지();
      await verify('왼쪽 메뉴에 「홈」 링크가 보인다', await 프로필.메뉴.링크('홈').isVisible(), true, { blocker: true });
      대상id = (await 계정찾기API(page, 'hana_photo')).id;
      원래메모 = (await 관계API(page, 대상id)).note;
      const 메모 = 표식('memo');
      await 메모바꾸기API(page, 대상id, 메모);
      await verify('hana_photo 에 남긴 개인 메모가 저장돼 있다', (await 관계API(page, 대상id)).note, 메모, { blocker: true });
    });

    await test.step('hana_photo 프로필을 연다', async () => {
      await 프로필.열기('hana_photo');
      const 보인다 = await 프로필.개인메모제목.waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('개인 메모를 남긴 hana_photo 프로필에 「개인 메모 (나에게만 보입니다)」가 보인다', 보인다, true);
    });
  } finally {
    if (대상id !== '') await 메모바꾸기API(page, 대상id, 원래메모);
  }
});
