// 성능 실행 결과 PDF — 결과 화면 차례(AI 분석 → 성능 목표 달성 여부 → 시간대별 추이 → 트랜잭션별) 그대로 (도메인/성능 §3.9 「PDF」)
// 케이스 증적과 다른 문서지만 문서판 · 글꼴 · 브라우저 대기줄은 같다 (도메인/리포팅 §8.4)

import { chromium } from '@playwright/test';

import { enqueue } from '../execution/dispatcher.js';
import { 문서판 } from '../reporting/html.js';
import { 안전 } from '../reporting/htmlItem.js';
import { percentile } from './hist.js';
import type { SecRow } from './judge.js';
import { 값글, 근거글, 실행번호글, 유형글, 지표글, 추이, 판정글 } from './pdfText.js';
import type { Target } from './types.js';

export { 실행번호글 } from './pdfText.js';

export interface 결과문서 {
  id: number;
  title: string;
  env: string;
  testType: string | null;
  status: string;
  verdict: 'PASS' | 'FAIL' | null;
  stopReason: string | null;
  startedAt: Date | null;
  peakVus: number | null;
  ai: { title: string; items: string[] } | null;
  targets: (Target & { measured: number | null; verdict: 'PASS' | 'FAIL' })[] | null;
  // 전체 줄(tx = '')만 — 추이를 그린다
  rows: SecRow[];
  // 트랜잭션마다 실행 전체를 합친 것 (store.트랜잭션합계)
  txs: { tx: string; requests: number; errors: number; hist: number[] }[];
}

function 트랜잭션별(txs: 결과문서['txs']): string {
  const 줄 = txs.map(({ tx, ...c }) =>
    `<tr><td>${안전(tx)}</td><td>${c.requests}</td><td>${값글('ERROR_RATE', c.requests === 0 ? null : (c.errors / c.requests) * 100)}</td><td>${값글('P95', percentile(c.hist, 0.95))}</td></tr>`);
  return `<table><thead><tr><th>트랜잭션</th><th>요청 수</th><th>에러율</th><th>95% 응답시간</th></tr></thead><tbody>${줄.join('')}</tbody></table>`;
}

export function 결과HTML(d: 결과문서): string {
  const 목표줄 = (d.targets ?? []).map((t) =>
    `<tr><td>${지표글[t.metric]}</td><td>${안전(t.scope ?? '전체')}</td><td>${t.op === '<=' ? '≤' : '≥'} ${값글(t.metric, t.value)}</td><td>${값글(t.metric, t.measured)}</td><td>${t.verdict === 'PASS' ? '통과' : '실패'}</td><td>${근거글[t.source]}${t.reqId ? ` ${안전(t.reqId)}` : ''}</td></tr>`);
  return 문서판(`${실행번호글(d.id)} ${d.title}`, [
    `<header><h1>${안전(`${실행번호글(d.id)} ${d.title}`)}</h1>`,
    `<p>${안전(유형글[d.testType ?? ''] ?? '')} · 대상 서버 ${안전(d.env)} · 시작 ${d.startedAt === null ? '—' : 안전(d.startedAt.toISOString())} · 판정 ${판정글(d.verdict, d.status)}</p>`,
    d.testType === 'STRESS' && d.peakVus !== null ? `<p>최대 동시 사용자 ${d.peakVus}명</p>` : '',
    `</header>`,
    `<h2>AI 분석</h2>`,
    d.ai === null ? '<p>AI 분석이 아직 없습니다</p>' : `<h3>${안전(d.ai.title)}</h3><ul>${d.ai.items.map((i) => `<li>${안전(i)}</li>`).join('')}</ul>`,
    `<h2>성능 목표 달성 여부</h2>`,
    목표줄.length === 0 ? '<p>판정한 성능 목표가 없습니다</p>' : `<table><thead><tr><th>지표</th><th>대상</th><th>목표</th><th>측정값</th><th>판정</th><th>근거</th></tr></thead><tbody>${목표줄.join('')}</tbody></table>`,
    `<h2>시간대별 추이</h2>`,
    추이(d.rows),
    `<h2>트랜잭션별 결과</h2>`,
    트랜잭션별(d.txs),
  ]);
}

export function PDF찍기(html: string): Promise<Buffer> {
  return enqueue(async () => {
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      return await page.pdf({ format: 'A4', printBackground: true });
    } finally {
      await browser.close();
    }
  });
}
