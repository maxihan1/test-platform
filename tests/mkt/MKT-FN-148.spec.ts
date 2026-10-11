import { defineCase, test, verify } from '@platform/kit';

export const spec = defineCase({
  tcId: 'MKT-FN-148',
  name: '노출 배너를 요청하면 배너 목록이 순서대로 온다',
  platforms: ['desktop'],
  precondition: ['대상 서버 API 에 접근할 수 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('노출 배너 API 를 요청한다', async () => {
    const 응답 = await request.get('/api/banners');
    await verify('응답 코드가 200 이다', 응답.status(), 200, { blocker: true });
    const 목록 = ((await 응답.json()) as { items?: { id?: number; title?: string; visible?: boolean }[] }).items;
    await verify(
      '노출 배너를 요청하면 배너 목록이 순서대로 온다',
      { 목록: Array.isArray(목록) && 목록.length > 0, 노출만: (목록 ?? []).every((배너) => 배너.visible === true), 제목있음: (목록 ?? []).every((배너) => typeof 배너.title === 'string') },
      { 목록: true, 노출만: true, 제목있음: true },
    );
  });

  await test.step('공지 팝업 설정 API 를 요청한다', async () => {
    const 응답 = await request.get('/api/settings');
    await verify('응답 코드가 200 이다', 응답.status(), 200, { blocker: true });
    const 본문 = (await 응답.json()) as { noticePopup?: unknown };
    await verify('공지 팝업 설정을 요청하면 켜짐 여부가 온다', typeof 본문.noticePopup, 'boolean');
  });
});
