// 안정화 지표 「AI 실행 요약」 판 — 한 줄 결론 · 주요 변화 · 기능별 오류 발생 케이스 · 판정과의 차이 · 해결 확인 · 추세 (도메인/안정화 §8.19 · 시안 6판)

import { use말 } from './i18n.js';
import { use휴대폰 } from './phone.js';
import type { 집계실행, 실행요약 } from './stabilityApi.js';
import { 상태칩 } from './StabilityErrors.js';
import { 작성시각글 } from './stabilityView.js';

type 말 = ReturnType<typeof use말>;

function 기능막대({ 줄들, t }: { 줄들: NonNullable<실행요약['features']>; t: 말 }) {
  if (줄들.length === 0) return <span className="stab-faint">{t('묶은 기능 없음')}</span>;
  const 최대 = Math.max(1, ...줄들.map((f) => f.errorCases));
  return (
    <div className="stab-dist">
      {줄들.map((f) => (
        <div key={f.name} className={f.errorCases === 0 ? 'zero' : undefined}>
          <span>{f.name}</span>
          <span className="stab-track">{f.errorCases === 0 ? null : <i className="dash-grow" style={{ width: `${String((f.errorCases / 최대) * 100)}%` }} />}</span>
          <span className="num">{f.errorCases}</span>
        </div>
      ))}
    </div>
  );
}

export function 요약판({ 요약, run }: { 요약: 실행요약 | null; run: 집계실행 }) {
  const t = use말();
  const 휴대폰 = use휴대폰();
  // 요약 일이 없는 옛 집계 줄은 판을 숨긴다. 에이전트가 쓰는 중이거나 실패했으면 판 자리에 그 한 줄이다 (§3.15 「AI 실행 요약」)
  if (요약 === null) return null;
  const 머리 = (
    <div className="stab-top">
      <h2 id="stab-ai">{t('AI 실행 요약')}</h2>
      {요약.status === 'DONE' ? (
        <span className="stab-aitag">
          {요약.finishedAt === null
            ? t('AI 작성 · 최근 7일 기준')
            : 휴대폰
              ? t('AI 작성 · {시각}', { 시각: 작성시각글(요약.finishedAt).slice(6) })
              : t('AI 작성 · {시각} · 최근 7일 기준', { 시각: 작성시각글(요약.finishedAt) })}
        </span>
      ) : null}
    </div>
  );
  if (요약.status !== 'DONE') {
    return (
      <section className="stab-panel dash-rise" aria-labelledby="stab-ai">
        {머리}
        <p className="stab-wait">{요약.status === 'FAILED' ? t('AI 요약을 만들지 못했습니다') : t('AI 요약 작성 중')}</p>
      </section>
    );
  }
  const 변화 = 요약.changes ?? [];
  return (
    <section className="stab-panel stab-ai dash-rise" aria-labelledby="stab-ai">
      {머리}
      <p className="stab-headline">{요약.headline}</p>
      <div className="stab-ai3">
        <div className="stab-blk">
          <h3>{t('주요 변화')}</h3>
          {변화.length === 0 ? (
            <span className="stab-faint">{t('신규 · 증가 · 재발 없음')}</span>
          ) : (
            변화.map((c) => (
              <div key={c.errorId} className="stab-li">
                <상태칩 상태={c.state} t={t} />
                <span>{c.text}</span>
              </div>
            ))
          )}
        </div>
        <div className="stab-blk">
          <h3>{t('기능별 오류 발생 케이스')}</h3>
          <기능막대 줄들={요약.features ?? []} t={t} />
        </div>
        <div className="stab-blk stab-gap">
          <h3>{t('판정과의 차이')}</h3>
          <span className="stab-big">{t('{수}건', { 수: run.passErrorCases })}</span>
          <span>{t('통과 판정이지만 오류 발생')}</span>
          {/* 오류 목록이 아니라 그 실행 결과 화면이다 — 묶음의 뒤 실행(기능 실행)을 연다 (§8.19 · STAB-F1-08 시작 질문 승인) */}
          <a href={`#/runs/${String(run.runId)}`}>{t('케이스 보기')}</a>
        </div>
      </div>
      <div className="stab-ai2">
        <div className="stab-blk row">
          <h3>{t('해결 확인')}</h3>
          <span>{요약.verified}</span>
        </div>
        <div className="stab-blk row">
          <h3>{t('추세')}</h3>
          <span>{요약.trend}</span>
        </div>
      </div>
    </section>
  );
}
