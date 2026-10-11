import { Pipe, PipeTransform, inject } from '@angular/core';
import { ClockService } from '../../core/services/clock.service';
import { formatMinutes, parseUtc, relativeTime } from '../../core/util/dates';

/** 2026-10-10T09:15:00Z -> "10 Oct 2026, 14:45" (viewer's local time). */
@Pipe({ name: 'dt' })
export class DateTimePipe implements PipeTransform {
  transform(value: string | null | undefined, withTime = true): string {
    const d = parseUtc(value);
    if (!d) return '–';
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
    if (withTime) { opts.hour = '2-digit'; opts.minute = '2-digit'; }
    return d.toLocaleString(undefined, opts);
  }
}

/** "5m ago". Impure on purpose: it reads the shared clock signal so it refreshes as time passes. */
@Pipe({ name: 'rel', pure: false })
export class RelativeTimePipe implements PipeTransform {
  private readonly clock = inject(ClockService);
  transform(value: string | null | undefined): string {
    return relativeTime(value, this.clock.now());
  }
}

/** 135 -> "2h 15m" */
@Pipe({ name: 'dur' })
export class DurationPipe implements PipeTransform {
  transform(minutes: number | null | undefined): string {
    return formatMinutes(minutes);
  }
}
