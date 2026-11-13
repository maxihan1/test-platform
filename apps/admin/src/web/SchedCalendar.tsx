// 정기 실행 달력 — 월 칸 · 주 · 일 세로 시간 줄 · 칸 창 (도메인/정기실행 §8.20 「달력」 · 「칸 창」)

import { Fragment } from 'react';

import { use말, use언어 } from './i18n.js';
import { Modal } from './Modal.js';
import type { 세트, 회차실행 } from './schedApi.js';
import { 세트색, 종류글, 짧은날, 요일글 } from './SchedCards.js';
import { 날더하기, 시각글, 시간범위, 실행주소, 월칸들, 주시작, type 칩 } from './schedView.js';

type 말 = ReturnType<typeof use말>;
export type 보기 = 'month' | 'week' | 'day';

const 시간글 = (분: number, t: 말) => {
  if (분 < 60) return t('{분}분', { 분 });
  return 분 % 60 === 0 ? t('{시}시간', { 시: 분 / 60 }) : t('{시}시간 {분}분', { 시: Math.floor(분 / 60), 분: 분 % 60 });
};

/** 칸 글자 — 통과 · 실패 N · 실행 중 · 결과 없음 · <시각> 예정 · <시각>쯤 시작 */
export function 결과글(c: 칩, t: 말): string {
  if (c.상태 === 'plan') return c.대기분 > 0 ? t('{시각}쯤 시작', { 시각: 시각글(c.시작분) }) : t('{시각} 예정', { 시각: 시각글(c.정한분) });
  if (c.상태 === 'running') return t('실행 중');
  if (c.상태 === 'pass') return t('통과');
  if (c.상태 === 'fail') return t('실패 {수}', { 수: c.실패 });
  // 판정할 실행이 없으면 결과 없이 의심 화면 수만 보인다 (§3.16 「회차의 결과」) — 호환성만 담은 세트
  return c.의심 > 0 ? t('의심 {수}', { 수: c.의심 }) : t('결과 없음');
}

const 칩글 = (c: 칩, t: 말) =>
  [c.대기분 > 0 ? t('대기') : null, 결과글(c, t), c.의심 > 0 && c.상태 !== 'none' ? t('의심 {수}', { 수: c.의심 }) : null].filter((x) => x !== null).join(' · ');

/** 기다린 칸의 한 줄 — 지난 것은 실제 시작, 앞으로의 것은 예상 */
function 대기글(c: 칩, t: 말): string | null {
  if (c.대기분 === 0) return null;
  if (c.상태 === 'plan') return t('{정한} 예정 · 앞 세트가 완료되면 시작 · {시작}쯤 예상', { 정한: 시각글(c.정한분), 시작: 시각글(c.시작분) });
  return t('{정한} 예정 → {시작} 시작 · 앞 세트 대기 {대기}', { 정한: 시각글(c.정한분), 시작: 시각글(c.시작분), 대기: 시간글(c.대기분, t) });
}

/** 칸이 실행을 가졌나 — 줄에 서 있는 회차와 앞으로의 예정은 아직 없다 */
const 실행있나 = (c: 칩) => c.회차 !== null && c.상태 !== 'plan';

function 실행알약({ r, t }: { r: 회차실행; t: 말 }) {
  const 도는중 = r.status === 'RUNNING' || r.status === 'QUEUED';
  if (r.kind === 'COMPAT' && !도는중) return (r.suspects ?? 0) > 0 ? <span className="sched-pill sus">{t('의심 {수}', { 수: r.suspects ?? 0 })}</span> : <span className="sched-pill none">{t('의심 없음')}</span>;
  if (r.failed > 0) return <span className="sched-pill fail">{t('실패 {수}', { 수: r.failed })}</span>;
  if (r.passed > 0) return <span className="sched-pill pass">{t('통과')}</span>;
  return <span className="sched-pill none">{도는중 ? t('실행 중') : t('결과 없음')}</span>;
}

/** 실행 줄 · 앞으로의 칸은 담은 테스트 줄 — 칸 창과 일 보기가 같이 쓴다 */
function 칸줄들({ c, t }: { c: 칩; t: 말 }) {
  if (!실행있나(c))
    return (
      <ul className="sched-runs">
        {c.세트.items.map((x, i) => (
          <li key={i}>
            <span className="sched-app">{x.service}</span>
            <span className="sched-run-name">
              {t(종류글[x.kind]!)} · {x.label}
            </span>
            <span className="sched-pill plan">{t('예정')}</span>
          </li>
        ))}
      </ul>
    );
  return (
    <ul className="sched-runs">
      {c.회차!.runs.map((r) => (
        <li key={r.runId}>
          <span className="sched-app">{r.service}</span>
          <a className="sched-run-name" href={실행주소(r.kind, r.runId)}>
            {t(종류글[r.kind]!)} · {r.title}
          </a>
          <span className="sched-run-end">
            <실행알약 r={r} t={t} />
            <a href={실행주소(r.kind, r.runId)}>#{r.runId} →</a>
          </span>
        </li>
      ))}
    </ul>
  );
}

function 칸설명({ c, t }: { c: 칩; t: 말 }) {
  const 대기 = 대기글(c, t);
  return (
    <>
      {대기 === null ? null : <p className="sched-wait">{대기}</p>}
      <p className="sched-meta">
        {실행있나(c)
          ? t('{날} {시각} 시작 · 실행 {수}개', { 날: 짧은날(c.날), 시각: 시각글(c.시작분), 수: c.회차!.runs.length })
          : t('{날} {시각}에 실행 예정입니다', { 날: 짧은날(c.날), 시각: 시각글(c.정한분) })}
      </p>
    </>
  );
}

/** on수정 은 앞으로의 칸 · 실행 write 일 때만 온다 — 없으면 단추를 안 세운다 (§8.20 「칸 창」) */
export function 칸창({ c, onClose, on수정 }: { c: 칩; onClose: () => void; on수정?: () => void }) {
  const t = use말();
  const 버튼 = (
    <>
      {on수정 === undefined ? null : (
        <button type="button" className="btn ghost" onClick={on수정}>
          {t('세트 수정')}
        </button>
      )}
      <button type="button" className="btn" onClick={onClose}>
        {t('닫기')}
      </button>
    </>
  );
  return (
    <Modal 제목={c.세트.name} onClose={onClose} 버튼={버튼}>
      <div className="sched-pop">
        <span className={`sched-pill ${c.상태}`}>{결과글(c, t)}</span>
        <칸설명 c={c} t={t} />
        <칸줄들 c={c} t={t} />
      </div>
    </Modal>
  );
}

function 칩단추({ c, 색, on열기 }: { c: 칩; 색: string; on열기: (c: 칩) => void }) {
  const t = use말();
  return (
    <button type="button" className={`sched-ev ${c.상태}`} onClick={() => on열기(c)}>
      <i className="sched-dot" style={{ background: 색 }} aria-hidden="true" />
      <span className="sched-ev-name">{c.세트.name}</span>
      <span className="sched-ev-r">{칩글(c, t)}</span>
    </button>
  );
}

interface 달력속성 {
  보기: 보기;
  기준: string;
  오늘: string;
  세트들: readonly 세트[];
  표: Map<string, 칩[]>;
  on열기: (c: 칩) => void;
  on날: (날: string) => void;
}

function 월보기({ 기준, 오늘, 세트들, 표, on열기, on날 }: 달력속성) {
  const 언어 = use언어();
  const 칸들 = 월칸들(기준);
  return (
    <div className="sched-month">
      {칸들.slice(0, 7).map((날) => (
        <div key={날} className="sched-wd">
          {요일글(날, 언어)}
        </div>
      ))}
      {칸들.map((날) => {
        const 줄 = 표.get(날) ?? [];
        return (
          <div key={날} className={`sched-day${날.slice(0, 7) === 기준.slice(0, 7) ? '' : ' out'}${날 === 오늘 ? ' today' : ''}`}>
            <span className="sched-n">{Number(날.slice(8))}</span>
            {줄.slice(0, 3).map((c) => (
              <칩단추 key={c.세트.id} c={c} 색={세트색(세트들, c.세트.id)} on열기={on열기} />
            ))}
            {줄.length > 3 ? (
              <button type="button" className="sched-link" onClick={() => on날(날)}>
                +{줄.length - 3}
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/** 한 시간 높이 — 35분 막대에도 두 줄(시각 · 이름 / 결과)이 들어간다. schedCal.css `.sched-col` 줄 간격과 같다 */
const 칸높이 = 56;

/** 세로 시간 줄 하나 — 지난 칸은 걸린 시간만큼 막대, 기다렸으면 정한 시각에 점선 (§8.20 「주 · 일 보기」) */
function 시간칸({ 줄, 범위, 세트들, on열기 }: { 줄: 칩[]; 범위: [number, number]; 세트들: readonly 세트[]; on열기: (c: 칩) => void }) {
  const t = use말();
  // 펼친 시간보다 앞선 칸은 없다(시간범위) — 그래도 위로 넘치지 않게 0 에서 멈춘다
  const 위 = (분: number) => Math.max(0, ((분 - 범위[0] * 60) / 60) * 칸높이);
  return (
    <div className="sched-col" style={{ height: (범위[1] - 범위[0]) * 칸높이 }}>
      {줄.map((c) => (
        <Fragment key={c.세트.id}>
          {c.대기분 > 0 ? (
            <div className="sched-ghost" style={{ top: 위(c.정한분) }}>
              <span>{t('{시각} {이름} 예정', { 시각: 시각글(c.정한분), 이름: c.세트.name })}</span>
            </div>
          ) : null}
          <button type="button" className={`sched-blk ${c.상태}`} style={{ top: 위(c.시작분), height: Math.max(34, ((c.끝분 - c.시작분) / 60) * 칸높이 - 2), borderLeftColor: 세트색(세트들, c.세트.id) }} onClick={() => on열기(c)}>
            <b>{시각글(c.시작분)}</b> {c.세트.name} · {칩글(c, t)}
          </button>
        </Fragment>
      ))}
    </div>
  );
}

function 시간축({ 범위 }: { 범위: [number, number] }) {
  return (
    <div className="sched-hours">
      {Array.from({ length: 범위[1] - 범위[0] }, (_, i) => (
        <span key={i} style={{ height: 칸높이 }}>
          {시각글((범위[0] + i) * 60)}
        </span>
      ))}
    </div>
  );
}

function 주보기({ 기준, 오늘, 세트들, 표, on열기 }: 달력속성) {
  const t = use말();
  const 언어 = use언어();
  const 날들 = Array.from({ length: 7 }, (_, i) => 날더하기(주시작(기준), i));
  const 범위 = 시간범위(날들.flatMap((날) => 표.get(날) ?? []));
  if (범위 === null) return <p className="sched-none">{t('이 기간에 실행할 세트가 없습니다')}</p>;
  return (
    <div className="sched-week">
      <span />
      {날들.map((날) => (
        <span key={날} className={`sched-hd${날 === 오늘 ? ' today' : ''}`}>
          {요일글(날, 언어)} {Number(날.slice(8))}
        </span>
      ))}
      <시간축 범위={범위} />
      {날들.map((날) => (
        <시간칸 key={날} 줄={표.get(날) ?? []} 범위={범위} 세트들={세트들} on열기={on열기} />
      ))}
    </div>
  );
}

/** 일 보기는 창 없이 오른쪽에 그날 실행 줄을 펼친다 */
function 일보기({ 기준, 세트들, 표, on열기 }: 달력속성) {
  const t = use말();
  const 줄 = 표.get(기준) ?? [];
  const 범위 = 시간범위(줄);
  if (범위 === null) return <p className="sched-none">{t('이날 실행할 세트가 없습니다')}</p>;
  return (
    <div className="sched-dayv">
      <div className="sched-tl">
        <시간축 범위={범위} />
        <시간칸 줄={줄} 범위={범위} 세트들={세트들} on열기={on열기} />
      </div>
      <div className="sched-daylist">
        {줄.map((c) => (
          <section key={c.세트.id}>
            <h3>
              <i className="sched-dot" style={{ background: 세트색(세트들, c.세트.id) }} aria-hidden="true" />
              {c.세트.name} <span className={`sched-pill ${c.상태}`}>{결과글(c, t)}</span>
            </h3>
            <칸설명 c={c} t={t} />
            <칸줄들 c={c} t={t} />
          </section>
        ))}
      </div>
    </div>
  );
}

export function 달력(속성: 달력속성) {
  if (속성.보기 === 'month') return <월보기 {...속성} />;
  if (속성.보기 === 'week') return <주보기 {...속성} />;
  return <일보기 {...속성} />;
}

/** 보기마다 서버에 물을 기간 — 월은 달력 칸 전체(월요일 ~ 일요일, 최대 42일) */
export function 기간(보기: 보기, 기준: string): [string, string] {
  if (보기 === 'month') {
    const 칸 = 월칸들(기준);
    return [칸[0]!, 칸.at(-1)!];
  }
  if (보기 === 'week') return [주시작(기준), 날더하기(주시작(기준), 6)];
  return [기준, 기준];
}

