// 정기 실행 리포트 일정 창 — 이름 · 담을 기간 · 실행 주기 한 장. 신규 · 수정이 같은 창이다. 달력 칸 창의 리포트 줄도 여기 있다 (도메인/정기실행 §8.20 「리포트 일정」 · 시안 HU7HWUkS5EDmaYpXwVfaA3 A)

import { useState } from 'react';

import { ApiError } from './api.js';
import { use말, use언어 } from './i18n.js';
import { 서울 } from './seoul.js';
import { Modal } from './Modal.js';
import { schedApi, type 리포트기간, type 세트 } from './schedApi.js';
import { 다음실행들, 보낼days, 처음값, type 덮을값 } from './schedForm.js';
import { 리포트기간글 } from './SchedCards.js';
import { 언제단계 } from './SchedWizardSteps.js';
import { 시간대로, 요일, 프로젝트리포트주소, type 칩 } from './schedView.js';
import { message, 기다림글자 } from './ui.js';

const 서버말: Record<string, string> = {
  NAME_TAKEN: '같은 이름의 세트가 이미 있습니다',
  PAST_ONCE: '이미 지난 날짜 · 시각입니다',
};
const 기간이름: Record<리포트기간, string> = { WEEK: '이번 주', MONTH: '이번 달' };

export function SchedReport({
  projectId,
  세트,
  세트들,
  onClose,
  on저장,
}: {
  projectId: number;
  /** 고칠 리포트 일정. null 이면 신규 */
  세트: 세트 | null;
  /** 같은 프로젝트의 세트 · 일정 — 이름 겹침을 미리 본다 */
  세트들: readonly 세트[];
  onClose: () => void;
  on저장: (이름: string, 다음: string | null, at: string) => void;
}) {
  const t = use말();
  const 언어 = use언어();
  // 새 일정은 한국 시간(Asia/Seoul)이고 고칠 때는 만든 때 것 그대로다 (§3.16 결정 6 · §7 PUT)
  const tz = 세트?.tz ?? 서울;
  // 신규는 시안 그대로 「주간 QA 리포트 · 매주 금 18:00 · 이번 주」로 연다
  const [v, setV] = useState(() =>
    세트 === null ? { ...처음값(null, 시간대로(new Date(), tz).날), name: t('주간 QA 리포트'), 반복: 'days' as const, days: [5], at: '18:00' } : 처음값(세트, 시간대로(new Date(), tz).날),
  );
  const [기간, set기간] = useState<리포트기간>(세트?.report ?? 'WEEK');
  const [보내는중, set보내는중] = useState(false);
  const [오류, set오류] = useState<string | null>(null);
  const 값 = (덮: 덮을값) => setV((앞) => ({ ...앞, ...덮 }));

  const days = 보낼days(v);
  const 다음 = 다음실행들(v, tz, new Date());
  // 기본 이름 그대로면 기간을 바꿀 때 이름도 따라 바꾼다 — 월간 일정이 「주간」 이름으로 저장되지 않게
  const 기본이름: Record<리포트기간, string> = { WEEK: t('주간 QA 리포트'), MONTH: t('월간 QA 리포트') };
  const 기간고르기 = (k: 리포트기간) => {
    if (v.name === 기본이름[기간]) 값({ name: 기본이름[k] });
    set기간(k);
  };
  // 기간은 만드는 날까지라 월요일(이번 주) · 1일(이번 달)에 만들면 하루치다 — 알리기만 한다
  const 첫날인가 = (날: string) => (기간 === 'WEEK' ? 요일(날) === 1 : 날.endsWith('-01'));
  const 하루치 = v.반복 === 'daily' || (v.반복 === 'days' && 기간 === 'WEEK' && v.days.includes(1)) || (v.반복 === 'once' && 첫날인가(v.onceOn));
  // 날짜 · 시각을 그대로 둔 「1회」는 지났어도 이름 · 기간만 고칠 수 있다 (§7 PUT)
  const 그대로 = 세트 !== null && 세트.onceOn !== null && 세트.onceOn === v.onceOn && 세트.at === v.at && v.반복 === 'once';
  const 막힘 =
    v.name.trim() === ''
      ? t('이름을 입력해 주세요')
      : 세트들.some((s) => s.id !== 세트?.id && s.name === v.name.trim())
        ? t('같은 이름의 세트가 이미 있습니다')
        : v.반복 === 'days' && v.days.length === 0
          ? t('요일을 하나 이상 선택해 주세요')
          : v.반복 === 'once' && 다음.length === 0 && !그대로
            ? t('이미 지난 날짜 · 시각입니다')
            : null;

  async function 저장() {
    if (막힘 !== null || 보내는중) return;
    set보내는중(true);
    set오류(null);
    const 몸 = { name: v.name.trim(), at: v.at, ...(days === null ? { onceOn: v.onceOn } : { days }), items: [], envs: [], report: 기간 };
    try {
      if (세트 === null) await schedApi.create({ ...몸, projectId, tz });
      else await schedApi.update(세트.id, 몸);
    } catch (err) {
      const 말 = err instanceof ApiError ? 서버말[err.message] : undefined;
      set오류(말 === undefined ? message(err, 언어) : t(말));
      set보내는중(false);
      return;
    }
    on저장(몸.name, (세트?.isOn ?? true) ? (다음[0] ?? null) : null, v.at);
  }

  const 버튼 = (
    <>
      {막힘 === null ? null : <span className="wiz-new-why">{막힘}</span>}
      <button className="btn ghost" type="button" disabled={보내는중} onClick={onClose}>
        {t('취소')}
      </button>
      <button className="btn" type="button" disabled={막힘 !== null || 보내는중} onClick={() => void 저장()}>
        <기다림글자 중={보내는중} 평소={t('저장')} 기다림={t('저장하는 중')} />
      </button>
    </>
  );

  return (
    <Modal 제목={세트 === null ? t('리포트 일정') : t('리포트 일정 수정')} onClose={() => !보내는중 && onClose()} 바깥눌러닫기={false} 버튼={버튼}>
      <div className="wiz-new sched-wiz sched-rep">
        <label className="authoring-field">
          <span>{t('이름')}</span>
          <input value={v.name} maxLength={100} onChange={(e) => 값({ name: e.target.value })} />
        </label>
        <div className="authoring-field">
          <span>{t('담을 기간')}</span>
          <div className="sched-seg" role="group" aria-label={t('담을 기간')}>
            {(['WEEK', 'MONTH'] as const).map((k) => (
              <button key={k} type="button" aria-pressed={기간 === k} onClick={() => 기간고르기(k)}>
                {t(기간이름[k])}
              </button>
            ))}
          </div>
          <small>{t('만드는 날까지 · 이번 주는 월요일부터, 이번 달은 1일부터입니다')}</small>
          {하루치 ? <p className="sched-wiz-note">{t('월요일(이번 주) · 1일(이번 달)에 만들면 그날 하루치만 담깁니다')}</p> : null}
        </div>
        <div className="authoring-field">
          <span>{t('실행 주기')}</span>
          <언제단계 v={v} on값={값} tz={tz} 겹침={[]} 호환성={false} />
        </div>
        <p className="sched-wiz-hint">{t('다른 세트가 실행 중이면 완료된 뒤 만듭니다')}</p>
        {오류 === null ? null : <span className="error-text">{오류}</span>}
      </div>
    </Modal>
  );
}

/** 리포트 일정 칸 — 담을 기간 한 줄과 못 만든 까닭 (§3.16 「리포트 일정」) */
export function 리포트줄({ c }: { c: 칩 }) {
  const t = use말();
  const 까닭 = c.회차?.notes ?? [];
  return (
    <ul className="sched-runs">
      <li>
        <span className="sched-run-name">{t(리포트기간글[c.세트.report ?? 'WEEK'])}</span>
        <span className="sched-run-end">
          {c.회차?.reportId == null ? (
            <span className={`sched-pill ${c.상태 === 'plan' ? 'plan' : 'none'}`}>{c.상태 === 'plan' ? t('예정') : c.상태 === 'running' ? t('실행 중') : t('결과 없음')}</span>
          ) : (
            <a href={프로젝트리포트주소(c.회차.reportId)}>{t('리포트 →')}</a>
          )}
        </span>
      </li>
      {까닭.map((n, i) => (
        <li key={i} className="error-text">
          {n.reason}
        </li>
      ))}
    </ul>
  );
}
