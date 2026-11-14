import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 리스트상세화면 } from './pages/list-detail.page.js';
import { 리스트화면 } from './pages/lists.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-207',
  name: '리스트에서 「리스트 삭제」를 누르면 「리스트를 삭제할까요?」 확인 창이 뜬다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 목록 = new 리스트화면(page);
  const 상세 = new 리스트상세화면(page);

  await test.step('일반 회원으로 로그인하고 「개발 소식」 리스트를 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 목록.열기();
    await 목록.항목링크('개발 소식').click();
    await 상세.제목.waitFor();
    await verify('리스트 화면에 「개발 소식」 제목이 보인다', await 상세.제목.innerText(), '개발 소식', { blocker: true });
  });

  await test.step('「개발 소식」 리스트에서 「리스트 삭제」를 누른다', async () => {
    await 상세.삭제창열기();
    const 떴다 = await 상세.확인창제목.filter({ hasText: '리스트를 삭제할까요?' }).waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('리스트에서 「리스트 삭제」를 누르면 「리스트를 삭제할까요?」 확인 창이 뜬다', 떴다, true);
    await 상세.확인창취소.click();
  });
});
