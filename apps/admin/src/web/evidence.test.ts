import { describe, expect, it } from 'vitest';

import type { EvidenceRow } from './api.js';
import { 받는법, 증적버튼들 } from './evidence.js';

function 증적(format: string, status: string): EvidenceRow {
  return {
    id: 1,
    format,
    status,
    filePath: status === 'READY' ? `artifacts/evidence/1.${format.toLowerCase()}` : null,
    error: status === 'FAILED' ? '스크린샷을 찾지 못했습니다' : null,
    generatedAt: '2026-09-19T04:00:00.000Z',
  };
}

function 버튼(줄: ReturnType<typeof 증적버튼들>, format: string) {
  return 줄?.버튼들.find((it) => it.format === format);
}

describe('증적 문서 버튼 (SPEC §8.4)', () => {
  it('실행이 도는 중이면 만들 버튼이 하나도 없고 언제 되는지 따로 알려준다', () => {
    const 줄 = 증적버튼들('RUNNING', [], 'operator');
    expect(줄?.버튼들).toEqual([]);
    expect(줄?.안내).toBe('실행이 끝나면 증적 문서를 만들 수 있습니다');
  });

  it('끝났고 문서가 없으면 §8.4 표의 형식마다 만들기 버튼이 하나씩 나온다', () => {
    const 줄 = 증적버튼들('FINISHED', [], 'operator');
    expect(줄?.버튼들.map((it) => it.format)).toEqual(['PDF', 'XLSX', 'HTML']);
    expect(줄?.버튼들.map((it) => it.글)).toEqual(['PDF 만들기', '엑셀 만들기', 'HTML 만들기']);
    expect(줄?.버튼들.every((it) => it.누를수있나)).toBe(true);
    expect(줄?.안내).toBe(null);
  });

  it('엑셀을 만드는 중이면 엑셀만 안 눌린다. 새로고침할 때마다 또 눌리면 문서 행이 쌓인다', () => {
    const 줄 = 증적버튼들('FINISHED', [증적('XLSX', 'PENDING')], 'operator');
    expect(버튼(줄, 'XLSX')).toMatchObject({ 누를수있나: false, 글: '엑셀 만드는 중' });
    expect(버튼(줄, 'PDF')).toMatchObject({ 누를수있나: true, 글: 'PDF 만들기' });
    expect(버튼(줄, 'HTML')).toMatchObject({ 누를수있나: true, 글: 'HTML 만들기' });
  });

  it('PDF 가 실패했으면 PDF 에만 사유와 다시 만들기가 붙는다', () => {
    const 줄 = 증적버튼들('FINISHED', [증적('PDF', 'FAILED')], 'operator');
    expect(버튼(줄, 'PDF')).toMatchObject({ 누를수있나: true, 글: 'PDF 다시 만들기' });
    expect(버튼(줄, 'PDF')?.사유).toBe('스크린샷을 찾지 못했습니다');
    expect(버튼(줄, 'XLSX')?.사유).toBe(null);
    expect(버튼(줄, 'HTML')?.사유).toBe(null);
  });

  it('이미 만든 형식만 다시 만들기가 된다. 같은 실행의 증적은 언제 뽑아도 같다', () => {
    const 줄 = 증적버튼들('FINISHED', [증적('PDF', 'READY')], 'operator');
    expect(버튼(줄, 'PDF')).toMatchObject({ 누를수있나: true, 글: 'PDF 다시 만들기' });
    expect(버튼(줄, 'HTML')?.글).toBe('HTML 만들기');
  });

  it('중단된 실행도 만들 수 있다. 여기까지 돌았다가 증적으로 성립한다', () => {
    const 줄 = 증적버튼들('ABORTED', [], 'operator');
    expect(줄?.버튼들.every((it) => it.누를수있나)).toBe(true);
    expect(줄?.버튼들.length).toBeGreaterThan(0);
  });

  it('실패한 뒤 다시 만들어 성공하면 옛 사유가 안 남는다', () => {
    // 서버가 id 오름차순으로 준다. find 로 첫 FAILED 를 잡으면 옛 사유가 영영 붙어 있다
    const 줄 = 증적버튼들('FINISHED', [증적('PDF', 'FAILED'), 증적('PDF', 'READY')], 'operator');
    expect(버튼(줄, 'PDF')?.사유).toBe(null);
    expect(버튼(줄, 'PDF')?.글).toBe('PDF 다시 만들기');
  });

  it('성공한 뒤 다시 만들다 실패하면 그 사유를 보여준다', () => {
    const 줄 = 증적버튼들('FINISHED', [증적('PDF', 'READY'), 증적('PDF', 'FAILED')], 'operator');
    expect(버튼(줄, 'PDF')?.사유).toBe('스크린샷을 찾지 못했습니다');
  });

  it('보기만 등급에게는 만들기 버튼이 아예 없다 (SPEC §3.5)', () => {
    expect(증적버튼들('FINISHED', [], 'viewer')).toBe(null);
  });
});

describe('만든 문서를 어떻게 받나 (SPEC §8.4)', () => {
  it('PDF 는 새 창에서 연다. 제출물이고 눌러서 바로 보인다', () => {
    expect(받는법('PDF')).toMatchObject({ 글: '열기 ↗', 새창: true });
  });

  it('HTML 도 새 창이다. Ctrl+F 가 된다', () => {
    expect(받는법('HTML')).toMatchObject({ 글: '열기 ↗', 새창: true });
  });

  it('엑셀은 브라우저가 못 연다. 받기로 내려받는다', () => {
    expect(받는법('XLSX')).toMatchObject({ 글: '받기', 새창: false });
  });

  it('대소문자를 가리지 않는다. 서버가 소문자로 저장할 수도 있다', () => {
    expect(받는법('pdf').새창).toBe(true);
    expect(받는법('xlsx').새창).toBe(false);
  });

  it('모르는 형식은 받기로 둔다. 열린다고 해 놓고 파일이 떨어지면 사람이 찾는다', () => {
    expect(받는법('무엇인가')).toMatchObject({ 글: '받기', 새창: false });
  });
});
