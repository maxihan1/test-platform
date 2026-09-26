// 표시용 모델이 §8.4 모양의 HTML 로 그려지는지 본다. 순수 함수라 DB 를 쓰지 않는다
// 마스킹·빈 값 처리는 collect.ts 가 이미 끝냈다. 여기서는 렌더러가 그것을 되돌리지 않는지만 본다

import { statSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import type { EvidenceDocument, EvidenceItem, EvidenceStep } from './collect.js';
import { renderHtml } from './html.js';

/**
 * html.ts 가 담는 글꼴 원본 넷. 경로가 여기서 갈리면 아래 바이트 수 검사가 먼저 빨개진다.
 *
 * 본문 둘(400·600)과 등폭 둘(400·500)이다. 등폭은 TC ID·소요시간·응답 코드가 쓴다 (DESIGN.md)
 */
const 글꼴파일들 = [
  'IBMPlexSansKR-Regular.woff2',
  'IBMPlexSansKR-SemiBold.woff2',
  'IBMPlexMono-Regular.woff2',
  'IBMPlexMono-Medium.woff2',
].map((이름) => new URL(`../web/fonts/${이름}`, import.meta.url));

const 옵션 = { generatedAt: '2026-09-19 10:00' };

const 머리말 = {
  serviceName: '커머스',
  testsRepo: 'https://git.example.com/commerce-tests',
  title: '야간 회귀',
  startedAt: '2026-09-18T22:00:00.000Z',
  triggeredByName: '김검수',
  env: 'qa',
  baseUrl: 'https://qa.example.com',
};

function 항목(덮을것: Partial<EvidenceItem>): EvidenceItem {
  return {
    tcId: 'AUTH-002',
    tcName: '유효한 이메일과 비밀번호로 로그인하면 토큰이 발급된다',
    platform: 'mobile',
    attempt: 1,
    unconfirmed: null,
    status: 'PASS',
    durationMs: 400,
    notRunReason: null,
    precondition: ['가입 완료된 사용자 계정이 존재한다'],
    params: [{ label: '아이디', value: 'testuser' }],
    expected: [{ label: '토큰 발급', value: 'true' }],
    steps: [],
    ...덮을것,
  };
}

function 문서(items: EvidenceItem[]): EvidenceDocument {
  return { runId: 7, header: 머리말, items };
}

// generate.ts 가 스크린샷을 문서 안에 심어 넘기므로 렌더러가 실제로 받는 값은 data: URI 다.
// 예전 픽스처의 '/shots/...' 같은 값은 어디에도 저장되지 않아 결함을 못 잡았다
const 화면 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const 깨진스텝: EvidenceStep = {
  seq: 2,
  title: '토큰을 검증한다',
  status: 'FAIL',
  durationMs: 88,
  screenshotPath: null,
  assertions: [
    {
      statement: '토큰이 발급된다',
      expected: 'true',
      actual: 'false',
      status: 'FAIL',
      blocker: true,
    },
  ],
};

describe('증적 문서 HTML', () => {
  it('머리말에 서비스 이름과 테스트 저장소 주소, 그 아래 실행 정보가 있다', () => {
    const html = renderHtml(문서([항목({})]), 옵션);

    // 저장소 주소가 없으면 「무엇을 시험한 것인가」가 문서에 남지 않는다 (SPEC §8.4)
    for (const 값 of [
      '커머스',
      'https://git.example.com/commerce-tests',
      '야간 회귀',
      '2026-09-18T22:00:00.000Z',
      '김검수',
      'qa',
      'https://qa.example.com',
      '2026-09-19 10:00',
    ]) {
      expect(html).toContain(값);
    }
  });

  it('반복 실행한 케이스는 회차마다 한 블록씩 나오고 회차 번호가 블록 머리에 있다', () => {
    const html = renderHtml(문서([항목({ attempt: 1 }), 항목({ attempt: 2, status: 'FAIL' })]), 옵션);

    expect(html.match(/<section class="item">/g)).toHaveLength(2);
    expect(html).toContain('1회차');
    expect(html).toContain('2회차');
  });

  it('검증 문장마다 기대·실제·판정이 한 줄이다', () => {
    const html = renderHtml(문서([항목({ status: 'FAIL', steps: [깨진스텝] })]), 옵션);

    // 케이스 이름에도 같은 문구가 들어 있다. 검증 줄만 골라야 「한 줄인가」를 본다
    const 줄들 = html
      .split('\n')
      .filter((줄) => 줄.includes('class="assert ') && 줄.includes('토큰이 발급된다'));
    expect(줄들).toHaveLength(1);

    const 줄 = 줄들[0] ?? '';
    for (const 조각 of ['기대', 'true', '실제', 'false', '실패', '실행 중단']) {
      expect(줄).toContain(조각);
    }
  });

  it('판정은 통과 · 실패 · 미실행 세 낱말로 적는다', () => {
    const html = renderHtml(
      문서([
        항목({ status: 'PASS' }),
        항목({ status: 'FAIL' }),
        항목({ status: 'NA', notRunReason: '러너에 닿지 못했습니다' }),
        항목({ status: 'NOT_RUN', durationMs: null, notRunReason: '실행이 멈춰 돌지 못했습니다' }),
      ]),
      옵션,
    );

    // 화면을 보던 사람이 문서를 받았을 때 다시 배울 것이 없어야 한다 (docs/DESIGN.md)
    for (const 낱말 of ['통과', '실패', '미실행']) {
      expect(html).toContain(낱말);
    }
    for (const 영문 of ['>PASS<', '>FAIL<', '>NA<', '>NOT_RUN<']) {
      expect(html).not.toContain(영문);
    }
  });

  it('NA 항목도 미실행 배지 옆에 사유를 나란히 적는다', () => {
    const html = renderHtml(
      문서([
        항목({
          tcId: 'NET-001',
          status: 'NA',
          durationMs: 4200,
          notRunReason: '러너에 닿지 못했습니다',
        }),
      ]),
      옵션,
    );

    // 사유가 배지와 떨어지면 러너 고장과 사람이 멈춘 것을 구분할 수 없다 (SPEC §8.3)
    const 머리 = html.split('\n').filter((줄) => 줄.includes('class="item-head"'));
    expect(머리).toHaveLength(1);
    expect(머리[0]).toContain('미실행');
    expect(머리[0]).toContain('러너에 닿지 못했습니다');
  });

  it('코드와 httpTrace 가 결과물에 없다', () => {
    const html = renderHtml(문서([항목({ status: 'FAIL', steps: [깨진스텝] })]), 옵션);

    // 「코드를 몰라도 쓴다」가 이 플랫폼의 전제다. 증적에는 스크린샷만 들어간다 (SPEC §8.4)
    for (const 금지 of ['httpTrace', '실패 지점 코드', '<pre', '<code']) {
      expect(html).not.toContain(금지);
    }
  });

  it('스크린샷은 실패한 검증 문장 바로 아래, 실패가 없으면 스텝 끝에 둔다', () => {
    const 여러검증: EvidenceStep = {
      seq: 1,
      title: '로그인 API를 호출한다',
      status: 'FAIL',
      durationMs: 312,
      screenshotPath: 화면,
      assertions: [
        {
          statement: '응답 코드가 정상이다',
          expected: '200',
          actual: '200',
          status: 'PASS',
          blocker: false,
        },
        {
          statement: '토큰이 발급된다',
          expected: 'true',
          actual: 'false',
          status: 'FAIL',
          blocker: false,
        },
        {
          statement: '유효기간이 3600초다',
          expected: '3600',
          actual: '0',
          status: 'FAIL',
          blocker: false,
        },
      ],
    };
    const 깨진html = renderHtml(문서([항목({ status: 'FAIL', steps: [여러검증] })]), 옵션);
    const 사진 = 깨진html.indexOf(화면);

    // 어느 확인에서 깨졌는지와 그때 화면이 나란히 붙어야 의미가 있다 (SPEC §8.4)
    expect(깨진html.indexOf('토큰이 발급된다')).toBeLessThan(사진);
    expect(사진).toBeLessThan(깨진html.indexOf('유효기간이 3600초다'));

    const 통과스텝: EvidenceStep = {
      ...여러검증,
      status: 'PASS',
      screenshotPath: 화면,
      assertions: [여러검증.assertions[0] ?? 깨진스텝.assertions[0]!],
    };
    const 통과html = renderHtml(문서([항목({ steps: [통과스텝] })]), 옵션);
    expect(통과html.indexOf('응답 코드가 정상이다')).toBeLessThan(
      통과html.indexOf(화면),
    );
  });

  it('모델이 가린 비밀값을 렌더러가 되돌리지 않는다', () => {
    const html = renderHtml(
      문서([
        항목({
          params: [
            { label: '아이디', value: 'testuser' },
            { label: '비밀번호', value: '********' },
          ],
        }),
      ]),
      옵션,
    );

    expect(html).toContain('********');
  });

  it('같은 모델을 두 번 렌더하면 글자까지 같다', () => {
    const doc = 문서([항목({ status: 'FAIL', steps: [깨진스텝] }), 항목({ attempt: 2 })]);

    // §3.3 재현 불변식. 본문에 new Date() 를 섞으면 여기서 빨간불이 난다
    expect(renderHtml(doc, 옵션)).toBe(renderHtml(doc, 옵션));
  });

  it('미실행 항목이 사유와 함께 문서에 남는다', () => {
    const html = renderHtml(
      문서([
        항목({
          tcId: 'PAY-010',
          status: 'NOT_RUN',
          durationMs: null,
          notRunReason: '사람이 실행을 멈춰 돌지 못했습니다',
        }),
      ]),
      옵션,
    );

    // 검수처에 내는 문서에서 항목이 그냥 사라지면 안 된다 (SPEC §8.4)
    expect(html).toContain('PAY-010');
    expect(html).toContain('사람이 실행을 멈춰 돌지 못했습니다');
  });

  it('이름과 검증 문장의 < 와 & 를 escape 한다', () => {
    const html = renderHtml(
      문서([
        항목({
          tcName: '<b>주문</b> & 결제',
          steps: [
            {
              ...깨진스텝,
              assertions: [
                {
                  statement: '<script>alert(1)</script>',
                  expected: 'a & b',
                  actual: '<none>',
                  status: 'FAIL',
                  blocker: false,
                },
              ],
            },
          ],
        }),
      ]),
      옵션,
    );

    expect(html).toContain('&lt;b&gt;주문&lt;/b&gt; &amp; 결제');
    expect(html).not.toContain('<b>주문');
    expect(html).not.toContain('<script>alert');
    expect(html).toContain('a &amp; b');
  });

  it('입력이 없으면 입력 없음이라고 적는다', () => {
    const html = renderHtml(문서([항목({ params: [] })]), 옵션);

    // 빈 칸을 두지 않는다 (SPEC §4.1 「없으면 없다고 적는다」)
    expect(html).toContain('입력 없음');
  });

  it('디바이스는 PC / 모바일로 적는다', () => {
    const html = renderHtml(문서([항목({ platform: 'mobile' }), 항목({ platform: 'desktop' })]), 옵션);

    expect(html).toContain('모바일');
    expect(html).toContain('PC');
    expect(html).not.toContain('>mobile<');
    expect(html).not.toContain('>desktop<');
  });

  it('A4 고정폭과 인쇄 규칙을 문서 안에 담는다', () => {
    const html = renderHtml(문서([항목({})]), 옵션);

    // 이 HTML 이 곧 PDF 의 원본이다. 바깥 파일을 참조하면 변환 때 안 붙는다
    expect(html).toContain('@page');
    expect(html).toContain('size: A4');
    expect(html).toContain('@media print');
    expect(html).toContain('<style>');
    expect(html).not.toContain('<link');
    expect(html).not.toContain('@import');
  });

  it('글꼴 파일 넷을 문서 안에 담고 본문이 그 이름을 부른다', () => {
    const html = renderHtml(문서([항목({})]), 옵션);

    // 이름이 갈리면 글꼴을 심어 놓고 안 쓴다. 이름만 부르던 옛 코드와 결과가 같아진다
    const 심은이름들 = [...html.matchAll(/@font-face\s*\{[^}]*?font-family:\s*([^;]+);/g)].map((m) =>
      m[1]!.trim(),
    );
    const 부르는이름 = /\bbody\s*\{[^}]*?font-family:\s*([^,;]+)/.exec(html)?.[1]?.trim();
    expect(new Set(심은이름들)).toEqual(new Set(['"IBM Plex Sans KR"', '"IBM Plex Mono"']));
    expect(부르는이름).toBe('"IBM Plex Sans KR"');

    // 「@font-face 라는 글자가 있다」만 보면 base64 가 잘려도 초록이다. 원본 바이트 수와 맞춘다
    const 담긴들 = [...html.matchAll(/src:\s*url\(data:font\/woff2;base64,([A-Za-z0-9+/=]+)\)/g)].map(
      (m) => Buffer.from(m[1]!, 'base64').byteLength,
    );
    expect(담긴들.sort()).toEqual(글꼴파일들.map((f) => statSync(f).size).sort());
  });

  /**
   * 증적 문서 한 부의 글꼴 무게 상한 (계획 2026-09-21 · 1단계).
   *
   * 글꼴을 base64 로 문서마다 심으므로 벌을 늘리면 문서가 그대로 무거워진다.
   * 옛 Pretendard 한 벌이 2.0MB(base64 약 2.68MB)였고, 상한은 4MB 로 뒀다.
   */
  it('심은 글꼴의 base64 합이 4MB 를 넘지 않는다', () => {
    const html = renderHtml(문서([항목({})]), 옵션);
    const 합 = [...html.matchAll(/src:\s*url\(data:font\/woff2;base64,([A-Za-z0-9+/=]+)\)/g)].reduce(
      (n, m) => n + m[1]!.length,
      0,
    );
    expect(합).toBeLessThan(4 * 1024 * 1024);
  });

});
