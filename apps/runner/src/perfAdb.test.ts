import { describe, expect, it } from 'vitest';

import {
  cpu틱을읽는다,
  gfxinfo를읽는다,
  surfaceView층을찾는다,
  totalTime을읽는다,
  기기목록,
  메모리Mb를읽는다,
  배터리를읽는다,
  연결된serial들,
  컴포넌트를읽는다,
  프레임시각들,
} from './perfAdb.js';

describe('연결된serial들', () => {
  it('device 상태인 폰만 고른다', () => {
    const out = [
      'List of devices attached',
      'R5CN123      device usb:1-1 product:o1s model:SM_G991N device:o1s transport_id:1',
      'emulator-5554 offline transport_id:2',
      'XYZ789       unauthorized usb:1-2 transport_id:3',
      '192.168.0.5:5555 device product:x model:Y device:z transport_id:4',
      '',
    ].join('\n');
    expect(연결된serial들(out)).toEqual(['R5CN123', '192.168.0.5:5555']);
  });
});

describe('gfxinfo를읽는다', () => {
  it('렌더링한 프레임과 끊긴 프레임 수를 읽는다', () => {
    const out = 'Stats since: 1234ns\nTotal frames rendered: 1520\nJanky frames: 38 (2.50%)\n50th percentile: 6ms';
    expect(gfxinfo를읽는다(out)).toEqual({ total: 1520, janky: 38, uptimeMs: null, frozen: null });
  });
  it('덤프를 뜬 시각(Uptime)도 읽는다', () => {
    const out = 'Applications Graphics Acceleration Info:\nUptime: 61209466 Realtime: 61209999\n\nTotal frames rendered: 10\nJanky frames: 1 (10.00%)\n';
    expect(gfxinfo를읽는다(out)).toEqual({ total: 10, janky: 1, uptimeMs: 61209466, frozen: null });
  });
  it('앱이 없으면 null', () => {
    expect(gfxinfo를읽는다('No process found for: com.x')).toBeNull();
  });
  it('프레임 시간 막대에서 700ms 칸(700~749ms)부터 더하고 GPU 막대는 안 본다', () => {
    const out = 'Total frames rendered: 10\nJanky frames: 3 (30.00%)\nHISTOGRAM: 5ms=5 650ms=1 700ms=2 750ms=3 4950ms=1\nGPU HISTOGRAM: 1ms=4 4950ms=9\n';
    expect(gfxinfo를읽는다(out)?.frozen).toBe(6);
  });
});

describe('surfaceView층을찾는다', () => {
  const 목록 = ['Display 0 (HWC)', 'com.android.systemui.ImageWallpaper#0', 'SurfaceView[com.game.app/com.game.Main](BLAST)#0', 'com.game.app/com.game.Main#0'].join('\n');
  it('패키지가 든 SurfaceView 층을 고른다', () => {
    expect(surfaceView층을찾는다(목록, 'com.game.app')).toBe('SurfaceView[com.game.app/com.game.Main](BLAST)#0');
  });
  it('없으면 null', () => {
    expect(surfaceView층을찾는다(목록, 'com.other.app')).toBeNull();
  });
  it('작은따옴표가 든 이름은 셸에 못 넣어 건너뛴다', () => {
    expect(surfaceView층을찾는다("SurfaceView - com.a.b/x'y#0", 'com.a.b')).toBeNull();
  });
});

describe('프레임시각들', () => {
  it('둘째 칸만 읽고 첫 줄 · 0 · INT64_MAX 는 거른다', () => {
    const out = ['16666666', '100 1000000000 105', '116 1016666666 121', '0 0 0', '132 9223372036854775807 137', ''].join('\n');
    expect(프레임시각들(out)).toEqual({ 시각: [1_000_000_000, 1_016_666_666], 꽉참: false });
  });
  it('안 쓴 칸(0)이 없으면 꽉 찼다', () => {
    const out = ['16666666', '100 1000000000 105', '132 9223372036854775807 137', ''].join('\n');
    expect(프레임시각들(out)).toEqual({ 시각: [1_000_000_000], 꽉참: true });
  });
});

describe('cpu틱을읽는다', () => {
  it('앱 utime+stime 과 전체 틱 합계(앞 8칸)를 읽는다', () => {
    const 앱 = '1234 (com.app x) S 1 1 0 0 -1 4194560 100 0 0 0 70 30 0 0 20 0 10 0 99 1000 500';
    const 전체 = 'cpu  100 10 50 800 20 5 15 0 7 0';
    expect(cpu틱을읽는다(`${앱}\n${전체}\ncpu0 1 2 3\n`)).toEqual({ proc: 100, total: 1000 });
  });
  it('줄이 빠지면 null', () => {
    expect(cpu틱을읽는다('cat: /proc/1/stat: No such file')).toBeNull();
  });
});

describe('메모리Mb를읽는다', () => {
  it('TOTAL PSS 줄을 MB 로 반올림한다', () => {
    expect(메모리Mb를읽는다('           TOTAL PSS:   204800            TOTAL RSS:   300000')).toBe(200);
  });
  it('표의 TOTAL 줄도 읽는다', () => {
    expect(메모리Mb를읽는다('   Java Heap:  1\n        TOTAL   153600   1000   2000')).toBe(150);
  });
  it('앱이 없으면 null', () => {
    expect(메모리Mb를읽는다('No process found for: com.x')).toBeNull();
  });
});

describe('배터리를읽는다', () => {
  it('온도는 0.1°C 단위를 풀고 잔량은 그대로', () => {
    expect(배터리를읽는다('  level: 85\n  temperature: 312\n')).toEqual({ tempC: 31.2, batteryPct: 85 });
  });
  it('없으면 null', () => {
    expect(배터리를읽는다('')).toEqual({ tempC: null, batteryPct: null });
  });
});

describe('컴포넌트를읽는다', () => {
  it('마지막 줄의 컴포넌트', () => {
    expect(컴포넌트를읽는다('priority=0 preferredOrder=0\ncom.app/.MainActivity\n')).toBe('com.app/.MainActivity');
  });
  it('컴포넌트 꼴이 아니면 null (셸에 안 넣는다)', () => {
    expect(컴포넌트를읽는다('com.app/.Main; reboot')).toBeNull();
    expect(컴포넌트를읽는다('No activity found')).toBeNull();
  });
});

describe('totalTime을읽는다', () => {
  it('am start -W 의 TotalTime', () => {
    expect(totalTime을읽는다('Status: ok\nThisTime: 400\nTotalTime: 812\nWaitTime: 830')).toBe(812);
  });
  it('못 읽으면 null', () => {
    expect(totalTime을읽는다('Error: Activity not started')).toBeNull();
  });
});

describe('기기목록', () => {
  it('붙은 폰마다 모델과 안드로이드 버전을 읽는다', async () => {
    const adb = async (args: string[]) => {
      const 줄 = args.join(' ');
      if (줄 === 'devices -l') return 'List of devices attached\nR5 device usb:1\n';
      if (줄 === '-s R5 shell getprop ro.product.model') return 'SM-G991N\n';
      if (줄 === '-s R5 shell getprop ro.build.version.release') return '14\n';
      throw new Error(`모르는 명령 ${줄}`);
    };
    expect(await 기기목록(adb)).toEqual([{ serial: 'R5', model: 'SM-G991N', os: '14' }]);
  });
  it('adb 가 없으면 빈 목록', async () => {
    const adb = async () => {
      throw new Error('spawn adb ENOENT');
    };
    expect(await 기기목록(adb)).toEqual([]);
  });
});
