import { defineCase, test, verify } from '@platform/kit';


export const spec = defineCase({
  tcId: 'MTW-FN-022',
  name: '인스턴스 설정 API 를 부르면 번역이 꺼져 있다고 나온다',
  precondition: ['대상 서버에 접근할 수 있다'],
  params: null,
  expected: null,
});
test(spec, async ({ request }) => {
  await test.step('인스턴스 설정 API 를 부른다', async () => {
    const 응답 = await request.get('/api/v2/instance');
    await verify('인스턴스 설정 API 가 200 으로 돌아온다', 응답.status(), 200, { blocker: true });
    const 번역 = ((await 응답.json()) as { configuration?: { translation?: { enabled?: boolean } } }).configuration?.translation?.enabled;
    await verify('인스턴스 설정 API 를 부르면 번역이 꺼져 있다고 나온다', 번역, false);
  });
});
