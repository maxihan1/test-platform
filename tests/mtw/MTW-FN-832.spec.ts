import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 계정설정화면 } from './pages/account-settings.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-832',
  name: '리디렉션을 설정하면 웹 앱 상단에 계정이 비활성화 상태라는 배너가 보인다',
  precondition: ['일회용 · 계정 이동 계정으로 로그인해 있다'],
  params: z.object({
    moveId: z.string().describe('일회용 계정 이동 이메일').optional().meta({ secret: true, account: '일회용 · 계정 이동' }),
    movePassword: z.string().describe('일회용 계정 이동 암호').optional().meta({ secret: true, account: '일회용 · 계정 이동' }),
    대상핸들: z.string().min(3).describe('리디렉션할 계정 핸들 — 이 서버에 있는 다른 계정').default('tc_move_target@mastodon.maxihan.com'),
  }),
  expected: null,
});
test(spec, async ({ page, params }) => {
  const 설정 = new 계정설정화면(page);
  const 홈 = new 홈화면(page);
  let 설정함 = false;

  await test.step('일회용 계정 이동 계정으로 로그인하고 리디렉션 화면을 연다', async () => {
    await 로그인하기(page, params.moveId, params.movePassword);
    await 설정.열기('/settings/migration/redirect/new');
    await verify('리디렉션 화면에 「리디렉션 설정」 버튼이 보인다', await 설정.버튼('리디렉션 설정').isVisible(), true, { blocker: true });
  });

  try {
    await test.step('계정 이동의 「리디렉션 설정」으로 이동 대상 계정을 넣고 저장한다', async () => {
      await 설정.칸('새 계정의 핸들').fill(params.대상핸들);
      await 설정.칸('현재 암호 입력').fill(params.movePassword ?? '');
      await 설정.보내기('리디렉션 설정');
      설정함 = true;
      await 홈.주소만열기();
      const 떴다 = await 홈.비활성배너.waitFor({ timeout: 5_000 }).then(() => true, () => false);
      await verify('리디렉션을 설정하면 웹 앱 상단에 계정이 비활성화 상태라는 배너가 보인다', 떴다, true);
    });
  } finally {
    if (설정함) {
      await 설정.열기('/settings/migration');
      const 취소 = 설정.링크(/리디렉트 취소하기|리디렉션 취소/).or(설정.버튼(/리디렉트 취소하기|리디렉션 취소/)).first();
      if (await 취소.isVisible()) {
        await 취소.click();
        await 설정.제목.waitFor();
      }
    }
  }
});
