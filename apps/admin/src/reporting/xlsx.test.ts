// 표시용 모델이 §8.4 「한 행 = 한 검증 문장」 표로 펴지는지 본다. 순수 함수라 DB 를 쓰지 않는다
// 만든 버퍼를 다시 읽어 셀을 확인한다 — 엑셀이 열리는 파일인지까지 같이 보증된다

import ExcelJS, { type Worksheet } from 'exceljs';
import { describe, expect, it } from 'vitest';

import type { EvidenceDocument, EvidenceItem, EvidenceStep } from './collect.js';
import { renderXlsx } from './xlsx.js';

const 옵션 = { generatedAt: '2026-09-19T10:00:00.000Z' };

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

function 스텝(덮을것: Partial<EvidenceStep>): EvidenceStep {
  return {
    seq: 1,
    title: '로그인 화면을 연다',
    status: 'PASS',
    durationMs: 120,
    screenshotPath: null,
    assertions: [],
    ...덮을것,
  };
}

function 문서(items: EvidenceItem[]): EvidenceDocument {
  return { runId: 7, header: 머리말, items };
}

async function 편다(doc: EvidenceDocument): Promise<Worksheet> {
  const buf = await renderXlsx(doc, 옵션);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(new Uint8Array(buf).buffer);
  return wb.worksheets[0];
}

function 셀(ws: Worksheet, 행: number, 칸: number): string {
  const 값 = ws.getRow(행).getCell(칸).value;
  return 값 === null || 값 === undefined ? '' : String(값);
}

function 행값(ws: Worksheet, 행: number): string[] {
  // 칸 수를 손으로 적으면 칸이 늘 때 마지막 칸이 조용히 빠진 채 초록이 난다 — 머리행이 센다
  const 칸수 = (ws.getRow(1).values as unknown[]).length - 1;
  return Array.from({ length: 칸수 }, (_, i) => 셀(ws, 행, i + 1));
}

describe('증적 문서 엑셀', () => {
  it('머리행이 §8.4 칸 순서 그대로다', async () => {
    const ws = await 편다(문서([항목({})]));

    expect(행값(ws, 1)).toEqual([
      'RUN',
      '실행일시',
      '서비스',
      '대상서버',
      '주소',
      '실행자',
      'tcId',
      '케이스명',
      '디바이스',
      '회차',
      '판정',
      '소요(ms)',
      '미실행·판정불가 사유',
      '사전조건',
      '입력값',
      '기대값',
      '절차번호',
      '절차명',
      '절차판정',
      '절차소요(ms)',
      '검증문장',
      '기대',
      '실제',
      '판정',
      '스크린샷경로',
    ]);
  });

  it('검증 문장 2개짜리 절차는 2행이 된다', async () => {
    const ws = await 편다(
      문서([
        항목({
          steps: [
            스텝({
              assertions: [
                { statement: '응답 코드가 200 이다', expected: '200', actual: '200', status: 'PASS', blocker: false },
                { statement: '토큰이 발급된다', expected: 'true', actual: 'false', status: 'FAIL', blocker: true },
              ],
            }),
          ],
        }),
      ]),
    );

    expect(ws.rowCount).toBe(3);
    expect(셀(ws, 2, 21)).toBe('응답 코드가 200 이다');
    expect(셀(ws, 3, 21)).toBe('토큰이 발급된다');
    expect(셀(ws, 3, 22)).toBe('true');
    expect(셀(ws, 3, 23)).toBe('false');
    expect(셀(ws, 3, 24)).toBe('실패');
  });

  it('검증 문장이 없는 절차도 한 행이 남는다', async () => {
    const ws = await 편다(문서([항목({ steps: [스텝({ seq: 3, title: '결제를 누른다', status: 'NA' })] })]));

    expect(ws.rowCount).toBe(2);
    expect(셀(ws, 2, 17)).toBe('3');
    expect(셀(ws, 2, 18)).toBe('결제를 누른다');
    expect(셀(ws, 2, 19)).toBe('미실행');
    expect(셀(ws, 2, 21)).toBe('');
  });

  it('절차가 하나도 없는 미실행 항목도 한 행이 남는다', async () => {
    const ws = await 편다(
      문서([항목({ status: 'NOT_RUN', durationMs: null, notRunReason: '실행이 멈춰 돌지 못했습니다', steps: [] })]),
    );

    expect(ws.rowCount).toBe(2);
    expect(셀(ws, 2, 7)).toBe('AUTH-002');
    expect(셀(ws, 2, 11)).toBe('미실행');
    expect(셀(ws, 2, 12)).toBe('');
    expect(셀(ws, 2, 13)).toBe('실행이 멈춰 돌지 못했습니다');
    expect(셀(ws, 2, 17)).toBe('');
  });

  it('판정을 못 낸 항목도 사유가 실리고 여러 행이면 행마다 반복된다', async () => {
    const ws = await 편다(
      문서([
        항목({
          status: 'NA',
          notRunReason: '러너에 닿지 못했습니다',
          steps: [
            스텝({
              assertions: [
                { statement: '첫째', expected: 'a', actual: '', status: 'NA', blocker: false },
                { statement: '둘째', expected: 'b', actual: '', status: 'NA', blocker: false },
              ],
            }),
          ],
        }),
      ]),
    );

    expect(셀(ws, 2, 13)).toBe('러너에 닿지 못했습니다');
    expect(셀(ws, 3, 13)).toBe('러너에 닿지 못했습니다');
  });

  it('사유가 없는 항목의 사유 칸은 빈 칸이다', async () => {
    const ws = await 편다(문서([항목({})]));

    expect(셀(ws, 2, 13)).toBe('');
  });

  it('상위 정보가 모든 행의 앞 칸에 반복되고 병합 셀이 하나도 없다', async () => {
    const ws = await 편다(
      문서([
        항목({
          steps: [
            스텝({
              assertions: [
                { statement: '첫째', expected: 'a', actual: 'a', status: 'PASS', blocker: false },
                { statement: '둘째', expected: 'b', actual: 'b', status: 'PASS', blocker: false },
              ],
            }),
          ],
        }),
      ]),
    );

    for (const 행 of [2, 3]) {
      expect(셀(ws, 행, 1)).toBe('7');
      expect(셀(ws, 행, 2)).toBe('2026-09-18T22:00:00.000Z');
      expect(셀(ws, 행, 3)).toBe('커머스');
      expect(셀(ws, 행, 4)).toBe('qa');
      expect(셀(ws, 행, 5)).toBe('https://qa.example.com');
      expect(셀(ws, 행, 6)).toBe('김검수');
      expect(셀(ws, 행, 7)).toBe('AUTH-002');
      expect(셀(ws, 행, 9)).toBe('모바일');
      expect(셀(ws, 행, 10)).toBe('1');
      expect(셀(ws, 행, 11)).toBe('통과');
      expect(셀(ws, 행, 17)).toBe('1');
    }

    expect(ws.model.merges).toEqual([]);
  });

  it('스크린샷은 이미지가 아니라 경로 글자다', async () => {
    const ws = await 편다(
      문서([
        항목({
          steps: [
            스텝({
              screenshotPath: 'artifacts/shots/7/AUTH-002-1.png',
              assertions: [{ statement: '첫째', expected: 'a', actual: 'b', status: 'FAIL', blocker: false }],
            }),
          ],
        }),
      ]),
    );

    expect(셀(ws, 2, 25)).toBe('artifacts/shots/7/AUTH-002-1.png');
    expect(ws.getImages()).toEqual([]);
  });

  it('비밀값은 모델이 가린 ******** 그대로 나간다', async () => {
    const ws = await 편다(
      문서([
        항목({
          params: [
            { label: '아이디', value: 'testuser' },
            { label: '비밀번호', value: '********' },
          ],
          expected: [{ label: '토큰 발급', value: 'true' }],
          precondition: ['가입 완료된 사용자 계정이 존재한다', '결제 수단이 등록돼 있다'],
        }),
      ]),
    );

    expect(셀(ws, 2, 14)).toBe('가입 완료된 사용자 계정이 존재한다\n결제 수단이 등록돼 있다');
    expect(셀(ws, 2, 15)).toBe('아이디: testuser\n비밀번호: ********');
    expect(셀(ws, 2, 15)).not.toContain('testpass');
    expect(셀(ws, 2, 16)).toBe('토큰 발급: true');
  });

  it('머리행이 고정된다', async () => {
    const ws = await 편다(문서([항목({})]));

    expect(ws.views[0]).toMatchObject({ state: 'frozen', ySplit: 1 });
  });

  it('같은 입력이면 같은 버퍼가 나온다', async () => {
    const doc = 문서([항목({})]);

    expect(await renderXlsx(doc, 옵션)).toEqual(await renderXlsx(doc, 옵션));
  });
});
