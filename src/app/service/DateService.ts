import { Injectable } from '@angular/core';
import * as moment from 'moment';

const DATE_SEP = '-';
const DATETIME_SEP = ' ';
const TIME_SEP = ':';
const ISO_DATE_TIME = 'YYYY-MM-DDTHH:mmZ';

@Injectable()
export class DateService {

  public compareDate(day1: Date, day2: Date): number {
    // Compare date
    let res: number = day1.getFullYear() - day2.getFullYear();
    if (res === 0) {
      res = day1.getMonth() - day2.getMonth();
      if (res === 0) {
        res = day1.getDate() - day2.getDate();
      }
    }
    return res;
  }

  public isToday(day: Date): boolean {
    return this.compareDate(day, new Date()) === 0;
  }

  public isLastDays(day: Date, nbDay: number): boolean {
    return day.getTime() > (new Date().getTime() - (nbDay * 24 * 60 * 60 * 1000));
  }

  public date2string(aDate: Date) {
    return aDate.getFullYear()
      + DATE_SEP + this.to2Digit(aDate.getMonth() + 1)
      + DATE_SEP + this.to2Digit(aDate.getDate());
  }

  public time2string(aDate: Date) {
    return this.to2Digit(aDate.getHours())
      + TIME_SEP + this.to2Digit(aDate.getMinutes());
  }

  public string2date(dateStr: string, aDate: Date = new Date()): Date {
    const elements = dateStr.split(DATE_SEP);
    aDate.setFullYear(Number.parseInt(elements[0], 0));
    aDate.setMonth(Number.parseInt(elements[1], 0) - 1);
    aDate.setDate(Number.parseInt(elements[2], 0));
    return aDate;
  }
  public string2time(dateStr: string, aDate: Date = new Date()): Date {
    const elements = dateStr.split(TIME_SEP);
    aDate.setHours(Number.parseInt(elements[0], 0));
    aDate.setMinutes(Number.parseInt(elements[1], 0));
    return aDate;
  }
  public datetime2string(aDate: Date) {
    return this.date2string(aDate) + DATETIME_SEP + this.time2string(aDate);
  }
  public string2datetime(dateStr: string, aDate: Date = new Date()): Date {
    const elements = dateStr.split(DATETIME_SEP);
    this.string2date(elements[0], aDate);
    this.string2time(elements[1], aDate);
    return aDate;
  }

  public to2Digit(nb: number): string {
    return (nb < 10 ? '0' : '') + nb;
  }
}
