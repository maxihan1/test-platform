// /proc 글을 바르게 읽고 1초 차이를 바르게 바꾸는지 본다. 글 꼴은 Linux 커널 문서의 꼴 그대로다

import { describe, expect, it } from 'vitest';

import { diff, parseDiskstats, parseMeminfo, parseNetDev, parseStat, type ProcSnapshot } from './proc.js';

describe('/proc 읽기', () => {
  it('cpu 첫 줄에서 쉬는 시간(idle + iowait)과 합을 센다', () => {
    expect(parseStat('cpu  100 0 50 800 50 0 0 0 0 0\ncpu0 1 2 3 4 5 6 7 8\n')).toEqual({ idle: 850, total: 1000 });
  });

  it('메모리 사용률은 (전체 − 쓸 수 있는 양) ÷ 전체다', () => {
    expect(parseMeminfo('MemTotal:       16000000 kB\nMemFree:         1000000 kB\nMemAvailable:    4000000 kB\n')).toBe(75);
  });

  it('디스크는 통디스크의 읽은 · 쓴 섹터만 더하고 파티션 · 루프는 뺀다', () => {
    const text = [
      '   7       0 loop0 10 0 999 0 0 0 999 0 0 0 0',
      ' 259       0 nvme0n1 100 0 2000 0 50 0 1000 0 0 0 0',
      ' 259       1 nvme0n1p1 90 0 1900 0 40 0 900 0 0 0 0',
      '   8       0 sda 10 0 30 0 5 0 70 0 0 0 0',
    ].join('\n');
    expect(parseDiskstats(text)).toBe(3100);
  });

  it('네트워크는 lo 를 빼고 받은 · 보낸 바이트를 더한다', () => {
    const text = [
      'Inter-|   Receive                                                |  Transmit',
      ' face |bytes    packets errs drop fifo frame compressed multicast|bytes    packets errs drop fifo colls carrier compressed',
      '    lo:  5000      10    0    0    0     0          0         0     5000      10    0    0    0     0       0          0',
      '  eth0: 2048      20    0    0    0     0          0         0     1024      10    0    0    0     0       0          0',
      '  eth1:  1024      20    0    0    0     0          0         0     1024      10    0    0    0     0       0          0',
    ].join('\n');
    expect(parseNetDev(text)).toEqual({ inBytes: 3072, outBytes: 2048 });
  });
});

describe('diff', () => {
  it('두 읽기 사이를 CPU % · KB/s 로 바꾼다', () => {
    const a: ProcSnapshot = { atMs: 0, cpuIdle: 800, cpuTotal: 1000, mem: 40, diskSectors: 0, netIn: 0, netOut: 0 };
    const b: ProcSnapshot = { atMs: 2000, cpuIdle: 950, cpuTotal: 1200, mem: 42.34, diskSectors: 4096, netIn: 20480, netOut: 2048 };
    expect(diff(a, b)).toEqual({ cpu: 25, mem: 42.3, diskIoKbps: 1024, netInKbps: 10, netOutKbps: 1 });
  });
});
