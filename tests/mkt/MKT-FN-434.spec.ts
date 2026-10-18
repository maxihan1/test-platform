import { defineCase, test, verify } from '@platform/kit';
import { 세션회원있는가 } from './helpers/account.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-434',
  name: '설정 요청은 공지 팝업 켜짐 여부를 참이나 거짓으로 준다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('비회원 상태를 확인한다', async () => {
    await verify('세션에 회원이 없다', await 세션회원있는가(request), false, { blocker: true });
  });

  await test.step('GET /api/settings 를 부른다', async () => {
    const 응답 = await request.get('/api/settings');
    const 본문 = (await 응답.json()) as { noticePopup: unknown };
    await verify('설정 요청은 공지 팝업 켜짐 여부를 참이나 거짓으로 준다', { 상태: 응답.status(), 참거짓: typeof 본문.noticePopup === 'boolean' }, { 상태: 200, 참거짓: true });
  });
});
