// 정기 실행 왼쪽 세트 카드 줄 — 반복 · 다음 실행 · 담은 것 · 마지막 결과 · 빠진 케이스 · 끄기 (도메인/정기실행 §8.20 「세트 카드」)

import { use말, use언어 } from './i18n.js';
import type { 세트 } from './schedApi.js';
import { 다음날, 시간대로 } from './schedView.js';

type 말 = ReturnType<typeof use말>;

/** 세트마다 색 점 — 판정 색 · 대표색과 겹치지 않는 파랑 · 회색 단계(DESIGN.md 원칙 1) */
const 점색 = ['var(--blue-1)', 'var(--chart-1)', 'var(--blue-2)', 'var(--chart-2)', 'var(--blue-3)', 'var(--chart-3)'];
export const 세트색 = (세트들: readonly 세트[], id: number) => 점색[Math.max(0, 세트들.findIndex((s) => s.id === id)) % 점색.length]!;

/** 11/14 꼴 — 카드 · 칸 창이 좁아 해를 뺀다 */
export const 짧은날 = (날: string) => `${String(Number(날.slice(5, 7)))}/${String(Number(날.slice(8, 10)))}`;
export const 요일글 = (날: string, 언어: string) => new Intl.DateTimeFormat(언어, { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${날}T00:00:00Z`));

export function 반복글(세트: 세트, t: 말, 언어: string): string {
  if (세트.onceOn !== null) return t('{날} 한 번', { 날: 짧은날(세트.onceOn) });
  const 요일들 = [...(세트.days ?? [])].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
  if (요일들.length === 7) return t('매일');
  if (요일들.join() === '1,2,3,4,5') return t('평일');
  // 2026-11-02(월)부터 하루씩 — 요일 이름을 브라우저 언어로 얻는다
  return t('매주 {요일}', { 요일: 요일들.map((d) => 요일글(`2026-11-0${String(d === 0 ? 8 : d + 1)}`, 언어)).join('·') });
}

export const 종류글: Record<string, string> = { FN: '기능', UI: 'UI', E2E: 'E2E', SCENARIO: 'E2E', COMPAT: '호환성' };

export function 판정알약({ 판정, t }: { 판정: 'PASS' | 'FAIL' | 'NONE' | 'RUNNING'; t: 말 }) {
  const [모양, 글] = { PASS: ['pass', '통과'], FAIL: ['fail', '실패 있음'], NONE: ['none', '결과 없음'], RUNNING: ['run', '실행 중'] }[판정];
  return <span className={`sched-pill ${모양}`}>{t(글)}</span>;
}

function 카드({ 세트, 색, 고름, 지금, 쓰나, on고르기, on날보기, on켜기 }: { 세트: 세트; 색: string; 고름: boolean; 지금: Date; 쓰나: boolean; on고르기: () => void; on날보기: (날: string) => void; on켜기: () => void }) {
  const t = use말();
  const 언어 = use언어();
  const 다음 = 다음날(세트, 지금);
  const 앱들 = [...new Set(세트.items.map((x) => x.service))];
  const 종류들 = [...new Set(세트.items.map((x) => t(종류글[x.kind]!)))];
  const 마지막 = 세트.last;
  return (
    <li className={`sched-card${고름 ? ' focus' : ''}${세트.isOn ? '' : ' off'}`}>
      <button type="button" className="sched-card-pick" aria-pressed={고름} onClick={on고르기}>
        <span className="sched-card-name">
          <i className="sched-dot" style={{ background: 색 }} aria-hidden="true" />
          {세트.name}
          {세트.isBase ? <span className="sched-tag">{t('안정화 기준')}</span> : null}
          {세트.isOn ? null : <span className="sched-tag">{t('꺼짐')}</span>}
        </span>
        <span className="sched-meta">
          {반복글(세트, t, 언어)} {세트.at}
          {다음 === null ? null : ' · '}
          {다음 === null ? null : t('다음 {날}', { 날: 짧은날(다음) })}
        </span>
        <span className="sched-meta">
          {앱들.join(' + ')} · {종류들.join(' · ')}
        </span>
      </button>
      {마지막 === null ? (
        <span className="sched-meta">{t('아직 실행한 적이 없습니다')}</span>
      ) : (
        <span className="sched-meta">
          {t('마지막 {날}', { 날: 짧은날(시간대로(new Date(마지막.plannedAt), 세트.tz).날) })} {/* 판정할 실행이 없고 의심만 있으면 결과 없이 의심 수만 (§3.16 「회차의 결과」) */}
          {마지막.verdict === 'NONE' && 마지막.suspects > 0 && 마지막.state === 'DONE' ? null : <판정알약 판정={마지막.state === 'RUNNING' ? 'RUNNING' : 마지막.verdict} t={t} />}
          {마지막.suspects > 0 ? <span className="sched-pill sus">{t('의심 {수}', { 수: 마지막.suspects })}</span> : null}{' '}
          <button type="button" className="sched-link" onClick={() => on날보기(시간대로(new Date(마지막.plannedAt), 세트.tz).날)}>
            {t('결과 →')}
          </button>
        </span>
      )}
      {세트.missing.cases > 0 ? <span className="sched-missing">{t('빠진 케이스 {수}건', { 수: 세트.missing.cases })}</span> : null}
      {세트.missing.tests > 0 ? <span className="sched-missing">{t('빠진 테스트 {수}개', { 수: 세트.missing.tests })}</span> : null}
      {/* 읽기만 하는 사람에게는 흐리게도 두지 않는다 (공통/5-화면공통 §8). 「수정」은 마법사와 같이 선다(SCHED-F1-06) */}
      {쓰나 ? (
        <span className="sched-card-acts">
          <button type="button" className="btn small ghost" onClick={on켜기}>
            {세트.isOn ? t('끄기') : t('켜기')}
          </button>
        </span>
      ) : null}
    </li>
  );
}

export function 세트카드들({
  세트들,
  고른,
  지금,
  쓰나,
  on고르기,
  on날보기,
  on켜기,
}: {
  세트들: readonly 세트[];
  고른: number | null;
  지금: Date;
  쓰나: boolean;
  on고르기: (id: number | null) => void;
  on날보기: (날: string) => void;
  on켜기: (세트: 세트) => void;
}) {
  const t = use말();
  return (
    <aside className="sched-sets" aria-label={t('세트')}>
      <h2>
        {t('세트 {수}개', { 수: 세트들.length })}
        {고른 === null ? null : (
          <button type="button" className="sched-link" onClick={() => on고르기(null)}>
            {t('전체 보기')}
          </button>
        )}
      </h2>
      <ul>
        {세트들.map((s) => (
          <카드
            key={s.id}
            세트={s}
            색={세트색(세트들, s.id)}
            고름={고른 === s.id}
            지금={지금}
            쓰나={쓰나}
            on고르기={() => on고르기(고른 === s.id ? null : s.id)}
            on날보기={on날보기}
            on켜기={() => on켜기(s)}
          />
        ))}
      </ul>
    </aside>
  );
}
