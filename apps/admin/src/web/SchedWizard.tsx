// 정기 실행 세트 마법사 — 가운데 창 다섯 단계(세트 이름 → 담을 테스트 → 대상 서버 → 언제 → 확인). 신규 · 수정이 같은 창이다 (도메인/정기실행 §8.20 「마법사」)

import { useState } from 'react';

import { ApiError, type ServiceRow } from './api.js';
import { 단계머리 } from './AuthoringNewSteps.js';
import { use말, use언어 } from './i18n.js';
import { Modal } from './Modal.js';
import { schedApi, type 세트 } from './schedApi.js';
import { 짧은날 } from './SchedCards.js';
import { 담기단계, 줄글 } from './SchedPick.js';
import { 다른기준있나, 겹치는세트들, 기준꼴, 다음실행들, 보낼days, 본문, 섞인E2E있나, 실행앱들, 처음값, type 덮을값 } from './schedForm.js';
import { 서버단계, 언제단계, 확인단계 } from './SchedWizardSteps.js';
import { 시간대로 } from './schedView.js';
import { Failed, Loading, message, useAsync, 기다림글자 } from './ui.js';

const 단계들 = ['세트 이름', '담을 테스트', '대상 서버', '언제', '확인'] as const;
const 서버말: Record<string, string> = {
  NAME_TAKEN: '같은 이름의 세트가 이미 있습니다',
  PAST_ONCE: '이미 지난 날짜 · 시각입니다',
  BASE_SET_SHAPE: '안정화 기준 세트의 조건에 맞지 않거나 이 애플리케이션에 다른 기준 세트가 있습니다',
};

export function SchedWizard({
  projectId,
  세트,
  세트들,
  앱들,
  onClose,
  on저장,
}: {
  projectId: number;
  /** 고칠 세트. null 이면 신규 */
  세트: 세트 | null;
  세트들: readonly 세트[];
  /** 이 프로젝트의 애플리케이션 — 대상 서버 줄 · 케이스 read 를 읽는다 */
  앱들: readonly ServiceRow[];
  onClose: () => void;
  /** 저장한 세트 이름 · 다음 실행 날짜 · 시각. 달력이 그 날짜로 간다 */
  on저장: (이름: string, 다음: string | null, at: string) => void;
}) {
  const t = use말();
  const 언어 = use언어();
  // 시간대는 세트를 만든 브라우저 것이고 고칠 때는 만든 때 것 그대로다 (§3.16 결정 6 · §7 PUT)
  const tz = 세트?.tz ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [v, setV] = useState(() => 처음값(세트, 시간대로(new Date(), tz).날));
  const 값 = (덮: 덮을값) => setV((앞) => ({ ...앞, ...덮 }));
  const [칸, set칸] = useState(0);
  const [보내는중, set보내는중] = useState(false);
  const [오류, set오류] = useState<string | null>(null);
  // POST 는 됐는데 기준 정하기가 실패했으면 다시 누를 때 고치기로 간다 — 같은 세트를 둘 만들지 않게
  const [만든번호, set만든번호] = useState<number | null>(세트?.id ?? null);
  const 후보 = useAsync(() => schedApi.candidates(projectId), [projectId]);

  const 실행앱 = 실행앱들(v.items, 후보.data);
  // 고르지 않은 애플리케이션은 첫 대상 서버로 둔다 — 실서비스 표시는 /auth/me 에 안 와서 서버가 400 으로 막는다
  const envs = Object.fromEntries(
    실행앱.flatMap((p) => {
      const 고름 = v.envs[p] ?? 앱들.find((s) => s.prefix === p)?.envs[0]?.env;
      return 고름 === undefined ? [] : [[p, 고름] as const];
    }),
  );
  const days = 보낼days(v);
  const onceOn = v.반복 === 'once' ? v.onceOn : null;
  const 다음 = 다음실행들(v, tz, new Date());
  const 기준앱 = 기준꼴(v.items, days);
  const 원래기준 = 세트?.isBase === true;
  // 꼴이 맞고 다른 기준이 없으면 체크가 선다. 원래 기준이면 꼴이 어긋나도 서서 풀 수 있게 한다 (§3.16 「기준 정하기 · 풀기」)
  const 기준칸 = 원래기준 || (기준앱 !== null && !다른기준있나(세트들, 기준앱, 세트?.id ?? null));
  // 날짜 · 시각을 그대로 둔 「한 번만」은 지났어도 이름 · 담은 테스트만 고칠 수 있다 (§7 PUT)
  const 그대로 = 세트 !== null && 세트.onceOn !== null && 세트.onceOn === onceOn && 세트.at === v.at;

  function 막는이유(i: number): string | null {
    switch (i) {
      case 0:
        if (v.name.trim() === '') return t('세트 이름을 입력해 주세요');
        return 세트들.some((s) => s.id !== 세트?.id && s.name === v.name.trim()) ? t('같은 이름의 세트가 이미 있습니다') : null;
      case 1:
        return v.items.length === 0 ? t('담을 테스트를 하나 이상 선택해 주세요') : null;
      case 2:
        return 실행앱.some((p) => envs[p] === undefined) ? t('대상 서버를 선택해 주세요') : null;
      case 3:
        if (v.반복 === 'days' && v.days.length === 0) return t('요일을 하나 이상 선택해 주세요');
        return v.반복 === 'once' && 다음.length === 0 && !그대로 ? t('이미 지난 날짜 · 시각입니다') : null;
      default:
        return v.기준 && 기준앱 === null ? t('안정화 기준 세트는 한 애플리케이션의 기능 · UI 테스트만 담고 매일 또는 요일로 반복합니다') : null;
    }
  }
  const 막힘 = 막는이유(칸);
  const 첫막힘 = 단계들.map((_, i) => 막는이유(i)).find((x) => x !== null) ?? null;

  async function 저장() {
    if (첫막힘 !== null || 보내는중) return;
    set보내는중(true);
    set오류(null);
    const 몸 = 본문({ ...v, envs }, 실행앱);
    try {
      const 기준켜기 = v.기준 && 기준칸;
      if (만든번호 === null) {
        const { id } = await schedApi.create({ ...몸, projectId, tz });
        set만든번호(id);
        if (기준켜기) await schedApi.setBase(id, true);
      } else {
        // 기준을 먼저 풀어야 꼴 밖으로 고친 본문이 BASE_SET_SHAPE 에 안 걸린다
        if (원래기준 && !v.기준) await schedApi.setBase(만든번호, false);
        await schedApi.update(만든번호, 몸);
        if (!원래기준 && 기준켜기) await schedApi.setBase(만든번호, true);
      }
    } catch (err) {
      const 말 = err instanceof ApiError ? 서버말[err.message] : undefined;
      set오류(말 === undefined ? message(err, 언어) : t(말));
      set보내는중(false);
      return;
    }
    on저장(몸.name, 다음[0] ?? null, v.at);
  }

  const 반복글 = v.반복 === 'once' ? t('{날} 한 번', { 날: 짧은날(v.onceOn) }) : v.반복 === 'daily' ? t('매일') : t('요일 선택');
  const 요약: [string, string][] = [
    [t('세트 이름'), v.name.trim()],
    [t('담은 테스트'), v.items.map((x) => `${x.service} ${줄글(x, t)}`).join(' · ')],
    [t('대상 서버'), 실행앱.map((p) => `${p} ${envs[p] ?? '—'}`).join(' · ')],
    [t('언제'), `${반복글} ${v.at} (${tz})`],
    [t('다음 실행'), 다음.map(짧은날).join(' · ') || '—'],
    [t('알림'), v.items.some((x) => x.kind === 'FN' || x.kind === 'UI') ? t('기능 · UI 실행마다 Slack 으로 보냅니다') : t('보내지 않습니다')],
  ];

  const 버튼 = (
    <>
      {(칸 === 4 ? 첫막힘 : 막힘) === null ? null : <span className="wiz-new-why">{칸 === 4 ? 첫막힘 : 막힘}</span>}
      <button className="btn ghost" type="button" disabled={보내는중} onClick={칸 === 0 ? onClose : () => set칸(칸 - 1)}>
        {칸 === 0 ? t('취소') : t('이전')}
      </button>
      {칸 === 4 ? (
        <button className="btn" type="button" disabled={첫막힘 !== null || 보내는중} onClick={() => void 저장()}>
          <기다림글자 중={보내는중} 평소={t('저장')} 기다림={t('저장하는 중')} />
        </button>
      ) : (
        <button className="btn" type="button" disabled={막힘 !== null || (칸 === 1 && 후보.data === null)} onClick={() => set칸(칸 + 1)}>
          {t('다음')}
        </button>
      )}
    </>
  );

  return (
    <Modal 제목={세트 === null ? t('신규 세트') : t('세트 수정')} onClose={() => !보내는중 && onClose()} 바깥눌러닫기={false} 버튼={버튼}>
      <div className="wiz-new sched-wiz">
        {/* 단계 줄을 눌러 앞 단계로 간다 (§8.20) — 뒤 단계로는 「다음」만 */}
        <ol className="wiz-new-steps" aria-label={t('단계')}>
          {단계들.map((이름, i) => (
            <li key={이름} className={i <= 칸 ? 'done' : undefined} aria-current={i === 칸 ? 'step' : undefined}>
              <i aria-hidden="true" />
              {i < 칸 ? (
                <button type="button" className="sched-link" onClick={() => set칸(i)}>
                  {i + 1}. {t(이름)}
                </button>
              ) : (
                <span>
                  {i + 1}. {t(이름)}
                </span>
              )}
            </li>
          ))}
        </ol>
        <단계머리 제목={t(단계들[칸]!)} />
        {칸 === 0 ? (
          <label className="authoring-field">
            <span>{t('세트 이름')}</span>
            <input value={v.name} maxLength={100} placeholder={t('예: 결제 회귀')} onChange={(e) => 값({ name: e.target.value })} />
          </label>
        ) : 칸 === 1 ? (
          후보.error !== null ? <Failed error={후보.error} /> : 후보.data === null ? <Loading /> : <담기단계 후={후보.data} 앱들={앱들} items={v.items} onItems={(items) => 값({ items })} />
        ) : 칸 === 2 ? (
          <서버단계 실행앱={실행앱} 앱들={앱들} envs={envs} on서버={(p, env) => 값({ envs: { ...v.envs, [p]: env } })} 섞임={섞인E2E있나(v.items, 후보.data)} />
        ) : 칸 === 3 ? (
          <언제단계
            v={v}
            on값={값}
            tz={tz}
            겹침={겹치는세트들(세트들, { id: 세트?.id ?? null, at: v.at, days, onceOn, avgMinutes: 세트?.avgMinutes ?? null })}
            호환성={v.items.some((x) => x.kind === 'COMPAT')}
          />
        ) : (
          <확인단계 줄들={요약} 기준칸={기준칸} 기준={v.기준} on기준={(기준) => 값({ 기준 })} />
        )}
        {오류 === null ? null : <span className="error-text">{오류}</span>}
      </div>
    </Modal>
  );
}
