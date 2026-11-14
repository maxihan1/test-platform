import { describe, expect, it } from 'vitest';

import { 서랍승인목록, 승인안읽은수, 승인열쇠, 승인줄만들기 } from './noticeApproval.js';
import { 승인전 } from './notice.fixture.js';

const 없음 = new Set<string>();

describe('승인 전 QA 리포트 줄 글자', () => {
  it('빌드가 있으면 빌드 번호로, 주소는 리포트 보기다', () => {
    const 줄 = 승인줄만들기(승인전(7), 'ko');
    expect(줄.머리).toBe('빌드 124 QA 리포트 · 승인 전');
    expect(줄.서비스).toBe('결제 애플리케이션');
    expect(줄.열기).toBe('#/qa-reports/7');
    expect(줄.열쇠).toBe('qa_report:7');
  });

  it('빌드가 없으면 RUN 번호, 성능 실행 하나면 PRF 번호', () => {
    expect(승인줄만들기(승인전(8, { buildNo: null, runId: 812 }), 'ko').머리).toBe('RUN 812 QA 리포트 · 승인 전');
    expect(승인줄만들기(승인전(9, { buildNo: null, perfRunId: 12 }), 'ko').머리).toBe('PRF-0012 QA 리포트 · 승인 전');
  });

  it('영어에서도 같은 틀이다', () => {
    expect(승인줄만들기(승인전(7), 'en').머리).toBe('Build 124 QA report · Not approved');
  });
});

describe('서랍에 서는 승인 전 줄', () => {
  const 줄들 = [승인전(1), 승인전(2)];

  it('전체에는 다 서고 실행 · 작성에는 안 선다', () => {
    expect(서랍승인목록(줄들, 없음, 'all').map(승인열쇠)).toEqual(['qa_report:1', 'qa_report:2']);
    expect(서랍승인목록(줄들, 없음, 'run')).toEqual([]);
    expect(서랍승인목록(줄들, 없음, 'authoring')).toEqual([]);
  });

  it('안 읽음에는 안 읽은 것만 선다', () => {
    expect(서랍승인목록(줄들, new Set(['qa_report:1']), 'unread').map(승인열쇠)).toEqual(['qa_report:2']);
  });

  it('안 읽은 수는 읽음 열쇠로 센다', () => {
    expect(승인안읽은수(줄들, 없음)).toBe(2);
    expect(승인안읽은수(줄들, new Set(['qa_report:2']))).toBe(1);
  });
});
