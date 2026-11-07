// 호환성 결과 카드 — 한 화면의 의심 카드를 한 묶음으로 접고, 칸마다 결함 확정 · 결함 아님을 누른다 (도메인/호환성 §3.13 「결과 · 판정」 · §8.17 ④)

import type { CompatCard, CompatRow, CompatRunDevice } from './compatApi.js';
import { 묶음자리, 카드자리 } from './CompatResultParts.js';
import { CompatShot } from './CompatShot.js';
import { type 카드묶음, 의심글자, 찍은때 } from './compatRunView.js';
import { use말, use언어 } from './i18n.js';
import { when } from './ui.js';

type 판정 = CompatCard['verdict'];

function 카드({ runId, c, 이름, d, 쓰나, 누르는중, on판정 }: { runId: number; c: CompatCard; 이름: string; d: CompatRunDevice | undefined; 쓰나: boolean; 누르는중: boolean; on판정: (v: 판정) => void }) {
  const t = use말();
  const 언어 = use언어();
  // 다시 누르면 미판정으로 되돌린다 (§3.13 「판정은 칸마다 하나다」)
  const 단추 = (v: NonNullable<판정>, 글: string) => (
    <button type="button" className="btn small ghost" aria-pressed={c.verdict === v} disabled={누르는중} onClick={() => on판정(c.verdict === v ? null : v)}>
      {t(글)}
    </button>
  );
  return (
    <div className="cr-card" id={카드자리(c.key, c.seq)}>
      <CompatShot runId={runId} screenId={c.screenId} issues={c.issues} 이름={`${d?.model ?? ''} ${이름}`} />
      <div className="cr-card-body">
        <b className="mono">{d?.model ?? c.seq}</b>
        <span className="compat-faint">{[d?.name, d?.os == null ? null : `Android ${d.os}`].filter(Boolean).join(' · ')}</span>
        {c.issues.map((i, n) => (
          <span key={n} className="cr-issue">
            <span className="cr-kind">{t(의심글자[i.kind] ?? i.kind)}</span> {i.note}
          </span>
        ))}
        <span className="compat-faint">{찍은때(c, t)}</span>
        {c.verdict === null ? null : (
          <span>
            <span className={c.verdict === 'CONFIRMED' ? 'compat-bad' : 'compat-tag'}>{t(c.verdict === 'CONFIRMED' ? '결함 확정' : '결함 아님')}</span>{' '}
            <span className="compat-faint">
              {c.judgedBy} · {c.judgedAt === null ? '' : when(c.judgedAt, 언어)}
            </span>
          </span>
        )}
        {쓰나 ? (
          <div className="cr-verdicts">
            {단추('CONFIRMED', '결함 확정')}
            {단추('NOT_DEFECT', '결함 아님')}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function CompatCards({
  runId,
  묶음들,
  rows,
  devices,
  펼친,
  on펼침,
  쓰나,
  누르는중,
  on판정,
}: {
  runId: number;
  묶음들: 카드묶음[];
  rows: readonly CompatRow[];
  devices: readonly CompatRunDevice[];
  펼친: ReadonlySet<string>;
  on펼침: (key: string) => void;
  쓰나: boolean;
  누르는중: string | null;
  on판정: (c: CompatCard, v: 판정) => void;
}) {
  const t = use말();
  const 상태 = new Map(devices.map((d) => [d.seq, d]));
  if (묶음들.length === 0) return <p className="compat-faint cr-none">{t('보일 카드가 없습니다')}</p>;
  return (
    <>
      {묶음들.map((m) => {
        const 열림 = 펼친.has(m.key);
        const 줄 = rows.find((r) => r.key === m.key);
        const 이상없음 = 줄?.cells.filter((c) => c.value === 'OK').length ?? 0;
        const 미점검 = 줄?.cells.filter((c) => c.value === 'UNCHECKED').length ?? 0;
        return (
          <section key={m.key} className="compat-panel" id={묶음자리(m.key)} aria-label={m.name}>
            <div className="cr-head">
              <h2>{m.name}</h2>
              <span className="mono compat-faint cr-key">{m.key}</span>
              <span className="compat-tag">{t('{전체}개 상태 중 {수}개 발생', { 전체: devices.length, 수: m.발생 })}</span>
              {m.확정 === 0 ? null : <span className="compat-bad">{t('결함 확정 {수}', { 수: m.확정 })}</span>}
              {m.미판정 === 0 ? null : <span className="compat-tag">{t('미판정 {수}', { 수: m.미판정 })}</span>}
              <button type="button" className="btn small ghost" aria-expanded={열림} onClick={() => on펼침(m.key)}>
                {열림 ? t('접기') : t('펼치기')}
              </button>
            </div>
            {!열림 ? null : (
              <>
                <div className="cr-cards">
                  {m.cards.map((c) => (
                    <카드
                      key={`${c.key}#${String(c.seq)}#${String(c.screenId)}`}
                      runId={runId}
                      c={c}
                      이름={m.name}
                      d={상태.get(c.seq)}
                      쓰나={쓰나}
                      누르는중={누르는중 === `${c.key}#${String(c.seq)}`}
                      on판정={(v) => on판정(c, v)}
                    />
                  ))}
                </div>
                <p className="compat-faint">{t('이상 없음 {수}개 · 미점검 {미}개', { 수: 이상없음, 미: 미점검 })}</p>
              </>
            )}
          </section>
        );
      })}
    </>
  );
}
