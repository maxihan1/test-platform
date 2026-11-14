import { defineCase, test, verify } from '@platform/kit';


export const spec = defineCase({
  tcId: 'MTW-FN-013',
  name: '이용 약관 API 와 개인정보처리방침 API 를 부르면 이용 약관은 없다고 나온다',
  precondition: ['대상 서버에 접근할 수 있다'],
  params: null,
  expected: null,
});
test(spec, async ({ request }) => {
  await test.step('이용 약관 API 와 개인정보처리방침 API 를 부른다', async () => {
    const 약관 = await request.get('/api/v1/instance/terms_of_service');
    await verify('이용 약관 API 와 개인정보처리방침 API 를 부르면 이용 약관은 없다고 나온다', 약관.status(), 404);
    const 방침 = await request.get('/api/v1/instance/privacy_policy');
    const 본문 = 방침.ok() ? ((await 방침.json()) as { content?: string }).content ?? '' : '';
    await verify('개인정보처리방침은 본문이 돌아온다', 본문.length > 0, true);
  });
});
