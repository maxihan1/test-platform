import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';


export const spec = defineCase({
  tcId: 'MTW-FN-019',
  name: '로그인 없이 로컬 · 원격 · 해시태그 · 소식 피드 API 를 부르면 모두 열린다',
  precondition: ['비회원이다'],
  params: z.object({
    해시태그: z.string().min(1).describe('열어 볼 해시태그 — 공개 글이 있는 태그').default('오늘의사진'),
  }),
  expected: null,
});
test(spec, async ({ request, params }) => {
  let 소식주소 = '';

  await test.step('소식 피드에 쓸 링크 주소를 찾는다', async () => {
    const 계정 = (await (await request.get('/api/v1/accounts/lookup?acct=news_bot')).json()) as { id: string };
    const 글들 = (await (await request.get(`/api/v1/accounts/${계정.id}/statuses?limit=20`)).json()) as { card?: { url?: string } | null }[];
    소식주소 = 글들.find((글) => 글.card?.url !== undefined)?.card?.url ?? '';
    await verify('링크 카드가 붙은 글의 주소를 찾았다', 소식주소.length > 0, true, { blocker: true });
  });

  await test.step('로그인 없이 로컬 · 원격 · 해시태그 · 소식 피드 API 를 부른다', async () => {
    const 로컬 = await verify('로컬 피드가 200 으로 열린다', (await request.get('/api/v1/timelines/public?local=true&limit=1')).status(), 200);
    const 원격 = await verify('원격 피드가 200 으로 열린다', (await request.get('/api/v1/timelines/public?remote=true&limit=1')).status(), 200);
    const 태그 = await verify('해시태그 피드가 200 으로 열린다', (await request.get(`/api/v1/timelines/tag/${encodeURIComponent(params.해시태그)}?limit=1`)).status(), 200);
    const 소식응답 = (await request.get(`/api/v1/timelines/link?url=${encodeURIComponent(소식주소)}&limit=1`)).status();
    const 소식 = await verify('소식 피드가 로그인을 요구하지 않는다(401 · 403 이 아니다)', 소식응답 !== 401 && 소식응답 !== 403, true);
    await verify('로그인 없이 로컬 · 원격 · 해시태그 · 소식 피드 API 를 부르면 모두 열린다', 로컬 && 원격 && 태그 && 소식, true);
  });
});
