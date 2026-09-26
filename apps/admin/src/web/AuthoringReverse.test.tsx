// @vitest-environment jsdom
// 역방향 작성 화면 검사 — 새 요청의 대조 칸 · 상세의 대조 설정 · 산출물 · 차이 목록 (도메인/작성 §3.6 「★ 역방향」 · §7)
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError, type AuthoringRow, type EnvRow } from './api.js';
import { AuthoringDetail } from './AuthoringDetail.js';
import { AuthoringNew } from './AuthoringNew.js';

const 부름: { 무엇: string; 값: unknown }[] = [];
let 만들기답: Promise<{ id: number }> = Promise.resolve({ id: 1 });
let 상세답: AuthoringRow;

vi.mock('./api.js', async () => {
  const 진짜 = await vi.importActual<typeof import('./api.js')>('./api.js');
  return {
    ...진짜,
    api: {
      createAuthoringRequest: (service: string, body: unknown) => {
        부름.push({ 무엇: '만들기', 값: { service, body } });
        return 만들기답;
      },
      uploadAuthoringAsset: (_service: string, id: number, file: File) => {
        부름.push({ 무엇: '올리기', 값: { id, 이름: file.name } });
        return Promise.resolve({ id: 1 });
      },
      submitAuthoringRequest: (_service: string, id: number) => {
        부름.push({ 무엇: '세우기', 값: { id } });
        return Promise.resolve({ ok: true });
      },
      authoringRequest: () => Promise.resolve(상세답),
      authoringAssetUrl: 진짜.api.authoringAssetUrl,
    },
  };
});

const 서버들: EnvRow[] = [
  { env: 'qa', baseUrl: 'https://qa.example.com' },
  { env: 'prod', baseUrl: 'https://example.com' },
];

beforeEach(() => {
  부름.length = 0;
  만들기답 = Promise.resolve({ id: 7 });
});

afterEach(() => {
  cleanup();
});

function 폼(envs: EnvRow[] = 서버들) {
  return render(<AuthoringNew service="PAY" envs={envs} on넣었다={() => {}} />);
}

function 대조를켠다() {
  fireEvent.click(screen.getByLabelText('실제 화면과 대조'));
}

function 시작주소를적는다(값: string) {
  fireEvent.change(screen.getByLabelText('시작 주소'), { target: { value: 값 } });
}

function 보내기(): HTMLButtonElement {
  return screen.getByRole('button', { name: '보내기' }) as HTMLButtonElement;
}

describe('새 요청 — 실제 화면과 대조', () => {
  it('대조를 켜기 전에는 대상 서버와 시작 주소 칸이 없다', () => {
    폼();
    expect(screen.queryByLabelText('대상 서버')).toBeNull();
    expect(screen.queryByLabelText('시작 주소')).toBeNull();
  });

  it('켜면 대상 서버를 전부 보인다 — 계정 없는 줄을 미리 거르지 않는다', () => {
    폼();
    대조를켠다();
    const 고르기 = screen.getByLabelText('대상 서버') as HTMLSelectElement;
    expect([...고르기.options].map((o) => o.value)).toEqual(['qa', 'prod']);
    expect(screen.getByLabelText('시작 주소')).toBeTruthy();
  });

  it('시작 주소만 있으면 기획서 없이 보낸다 — 화면만', async () => {
    폼();
    대조를켠다();
    시작주소를적는다('  https://qa.example.com/orders  ');
    expect(보내기().disabled).toBe(false);
    fireEvent.click(보내기());
    await waitFor(() => expect(부름.map((b) => b.무엇)).toEqual(['만들기', '세우기']));
    expect(부름[0]?.값).toEqual({
      service: 'PAY',
      body: { kind: 'AUTHOR', figma: [], compare: true, env: 'qa', startUrl: 'https://qa.example.com/orders' },
    });
  });

  it('대조인데 시작 주소도 자료도 없으면 보낼 수 없다', () => {
    폼();
    대조를켠다();
    expect(보내기().disabled).toBe(true);
  });

  it('대상 서버를 바꿔 고르면 그 서버로 보낸다', async () => {
    폼();
    대조를켠다();
    fireEvent.change(screen.getByLabelText('대상 서버'), { target: { value: 'prod' } });
    시작주소를적는다('https://example.com/');
    fireEvent.click(보내기());
    await waitFor(() => expect(부름.length).toBeGreaterThan(0));
    expect(부름[0]?.값).toMatchObject({ body: { env: 'prod' } });
  });

  it('서비스를 바꾸면 전에 고른 대상 서버가 남지 않는다 — 보이는 서버로 보낸다', async () => {
    const { rerender } = 폼();
    대조를켠다();
    fireEvent.change(screen.getByLabelText('대상 서버'), { target: { value: 'prod' } });
    rerender(<AuthoringNew service="SHOP" envs={[{ env: 'dev', baseUrl: 'https://dev.shop.example.com' }]} on넣었다={() => {}} />);
    expect((screen.getByLabelText('대상 서버') as HTMLSelectElement).value).toBe('dev');
    시작주소를적는다('https://dev.shop.example.com/');
    fireEvent.click(보내기());
    await waitFor(() => expect(부름.length).toBeGreaterThan(0));
    expect(부름[0]?.값).toMatchObject({ service: 'SHOP', body: { env: 'dev' } });
  });

  it('대상 서버가 없는 서비스로 바꾸면 보낼 수 없다', () => {
    const { rerender } = 폼();
    대조를켠다();
    fireEvent.change(screen.getByLabelText('대상 서버'), { target: { value: 'prod' } });
    rerender(<AuthoringNew service="SHOP" envs={[]} on넣었다={() => {}} />);
    fireEvent.change(screen.getByLabelText('피그마 주소'), { target: { value: 'https://www.figma.com/design/AbC/' } });
    expect(보내기().disabled).toBe(true);
  });

  it('대조를 끄면 대조 칸을 싣지 않는다 — 정방향 그대로', async () => {
    폼();
    대조를켠다();
    대조를켠다();
    fireEvent.change(screen.getByLabelText('피그마 주소'), { target: { value: 'https://www.figma.com/design/AbC/' } });
    fireEvent.click(보내기());
    await waitFor(() => expect(부름.length).toBeGreaterThan(0));
    expect(부름[0]?.값).toEqual({ service: 'PAY', body: { kind: 'AUTHOR', figma: ['https://www.figma.com/design/AbC/'] } });
  });

  it('시작 주소를 비우면 키를 싣지 않는다 — 기획서가 말하는 화면에서 시작한다', async () => {
    폼();
    대조를켠다();
    fireEvent.change(screen.getByLabelText('피그마 주소'), { target: { value: 'https://www.figma.com/design/AbC/' } });
    fireEvent.click(보내기());
    await waitFor(() => expect(부름.length).toBeGreaterThan(0));
    expect(부름[0]?.값).toEqual({
      service: 'PAY',
      body: { kind: 'AUTHOR', figma: ['https://www.figma.com/design/AbC/'], compare: true, env: 'qa' },
    });
  });

  it('테스트 계정이 없는 서버면 서버 거절을 사람 말로 보인다', async () => {
    만들기답 = Promise.reject(new ApiError(400, 'BAD_ENV', ''));
    폼();
    대조를켠다();
    시작주소를적는다('https://example.com/');
    fireEvent.click(보내기());
    expect(await screen.findByText('이 대상 서버에는 테스트 계정이 없습니다. 설정 > 서비스에서 테스트 계정을 넣으세요')).toBeTruthy();
  });

  it('시작 주소가 서버와 다르면 서버 거절을 사람 말로 보인다', async () => {
    만들기답 = Promise.reject(new ApiError(400, 'BAD_START_URL', ''));
    폼();
    대조를켠다();
    시작주소를적는다('https://other.example.com/');
    fireEvent.click(보내기());
    expect(
      await screen.findByText('시작 주소는 고른 대상 서버와 같은 주소(도메인 · 포트)여야 합니다'),
    ).toBeTruthy();
  });

  it('대상 서버가 하나도 없으면 설정으로 안내하고 보낼 수 없다', () => {
    폼([]);
    대조를켠다();
    expect(screen.getByText('이 서비스에는 대상 서버가 없습니다. 설정 > 서비스에서 먼저 넣으세요')).toBeTruthy();
    expect(screen.queryByLabelText('시작 주소')).toBeNull();
    fireEvent.change(screen.getByLabelText('피그마 주소'), { target: { value: 'https://www.figma.com/design/AbC/' } });
    expect(보내기().disabled).toBe(true);
  });
});

function 줄(덮을것: Partial<AuthoringRow>): AuthoringRow {
  return {
    id: 7,
    kind: 'AUTHOR',
    sourceId: null,
    status: 'DONE',
    stage: '끝',
    stageAt: new Date().toISOString(),
    requestedByName: '테스터',
    claimedBy: '작성봇',
    prUrl: null,
    error: null,
    createdAt: new Date().toISOString(),
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    ...덮을것,
  };
}

function 자료(id: number, 덮을것: Partial<NonNullable<AuthoringRow['assets']>[number]>) {
  return { id, position: id, kind: 'FILE' as const, name: `f${id}`, figmaUrl: null, size: 1, role: 'INPUT' as const, sourceAssetId: null, ...덮을것 };
}

async function 상세를연다(행: AuthoringRow) {
  상세답 = 행;
  render(<AuthoringDetail service="PAY" id={7} role="operator" />);
  await screen.findByText('상태');
}

describe('상세 — 대조 설정 · 산출물 · 차이 목록', () => {
  it('대조 요청은 대상 서버와 시작 주소를 보인다', async () => {
    await 상세를연다(줄({ compare: true, env: 'qa', startUrl: 'https://qa.example.com/orders', assets: [자료(1, { name: '기획서.docx' })] }));
    expect(screen.getByText('실제 화면과 대조')).toBeTruthy();
    expect(screen.getByText('qa · https://qa.example.com/orders')).toBeTruthy();
  });

  it('시작 주소가 없으면 기획서가 말하는 화면에서 시작한다고 적는다', async () => {
    await 상세를연다(줄({ compare: true, env: 'qa', startUrl: null, assets: [자료(1, { name: '기획서.docx' })] }));
    expect(screen.getByText('qa · 기획서가 말하는 화면에서 시작')).toBeTruthy();
  });

  it('입력 자료가 없는 대조 요청은 화면만이라고 적는다', async () => {
    await 상세를연다(줄({ compare: true, env: 'qa', startUrl: 'https://qa.example.com/', assets: [] }));
    expect(screen.getByText('화면만 — 기획서 없이 이 화면을 훑습니다')).toBeTruthy();
  });

  it('정방향 요청에는 대조 줄이 없다', async () => {
    await 상세를연다(줄({ compare: false, env: null, startUrl: null }));
    expect(screen.queryByText('실제 화면과 대조')).toBeNull();
  });

  it('산출물은 입력 자료와 따로 적고 무엇의 사본인지 보인다', async () => {
    await 상세를연다(
      줄({
        compare: true,
        env: 'qa',
        startUrl: null,
        assets: [
          자료(1, { name: '기획서.docx' }),
          자료(2, { name: '기획서-표시.docx', role: 'MARKED', sourceAssetId: 1 }),
          자료(3, { name: '역기획서.docx', role: 'REVERSE_SPEC' }),
        ],
      }),
    );
    const 산출물 = screen.getByRole('list', { name: '산출물' });
    expect(산출물.textContent).toContain('표시 사본 — 기획서.docx');
    expect(산출물.textContent).toContain('역기획서');
    const 입력 = screen.getByRole('list', { name: '입력 자료' });
    expect(입력.textContent).toBe('기획서.docx');
  });

  it('차이 목록은 번호 · 종류 · 자리 · 기획서 · 화면 · 케이스를 보이고 표시 실패는 이유를 붙인다', async () => {
    await 상세를연다(
      줄({
        compare: true,
        env: 'qa',
        startUrl: null,
        result: {
          diffs: [
            { no: 'D1', kind: 'DIFFERENT', where: '기획서.docx · 3쪽', doc: '저장', screen: '확인', tcId: 'PAY-012', marked: true },
            { no: 'D2', kind: 'SCREEN_ONLY', where: '주문 화면', doc: null, screen: '쿠폰 칸', marked: false, markError: '피그마 토큰에 댓글 권한이 없습니다' },
            { no: 'D3', kind: 'DOC_ONLY', where: '기획서.docx · 5쪽', doc: '엑셀 내려받기', screen: null, marked: false },
          ],
        },
      }),
    );
    const 표 = screen.getByRole('table', { name: '기획서와 화면의 차이' });
    const 글 = 표.textContent ?? '';
    for (const 조각 of ['D1', '기획서와 다름', '기획서.docx · 3쪽', '저장', '확인', 'PAY-012', '표시함']) expect(글).toContain(조각);
    expect(글).toContain('화면에만 있음');
    expect(글).toContain('표시 못 함 — 피그마 토큰에 댓글 권한이 없습니다');
    expect(글).toContain('문서에만 있음');
    expect(글).toContain('표시 못 함 — 이유 기록 없음');
  });

  it('차이 목록 줄에 판정 색을 입히지 않는다 — 차이는 판정이 아니다', async () => {
    await 상세를연다(
      줄({
        compare: true,
        env: 'qa',
        startUrl: null,
        result: { diffs: [{ no: 'D1', kind: 'DIFFERENT', where: 'x', doc: 'a', screen: 'b', marked: false, markError: '이유' }] },
      }),
    );
    const 표 = screen.getByRole('table', { name: '기획서와 화면의 차이' });
    expect(표.querySelector('.error-text, .why, .fail, .pass')).toBeNull();
  });

  it('차이 목록이 모양이 틀려도 깨지지 않는다 — 서버가 모양을 검사하지 않는다', async () => {
    await 상세를연다(
      줄({ compare: true, env: 'qa', startUrl: null, result: { diffs: [null, 3, { no: 5, kind: 'ODD' }, { no: 'D9' }] } }),
    );
    const 표 = screen.getByRole('table', { name: '기획서와 화면의 차이' });
    expect(표.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(표.textContent).toContain('D9');
  });

  it('차이 목록이 배열이 아니면 표를 그리지 않는다', async () => {
    await 상세를연다(줄({ compare: true, env: 'qa', startUrl: null, result: { diffs: '없음' } }));
    expect(screen.queryByRole('table', { name: '기획서와 화면의 차이' })).toBeNull();
  });
});
