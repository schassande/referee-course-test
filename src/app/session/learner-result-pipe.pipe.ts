import { Pipe, PipeTransform } from '@angular/core';
import { SessionParticipant } from '../model/model';

@Pipe({
  name: 'learnerResultPipe'
})
export class LearnerResultPipePipe implements PipeTransform {

  transform(participants: SessionParticipant[]): SessionParticipant[] {
    const result: SessionParticipant[] = [].concat(participants);
    result.sort((a:SessionParticipant, b:SessionParticipant) => {
      if (a.pass && b.pass) {
        return a.person.firstName.toLocaleLowerCase().localeCompare(b.person.firstName.toLocaleLowerCase());
      }
      if (a.pass && !b.pass) {
        return -1;
      }
      if (!a.pass && b.pass) {
        return 1;
      }
      if (a.canPass && b.canPass) {
        return a.person.firstName.toLocaleLowerCase().localeCompare(b.person.firstName.toLocaleLowerCase());
      }
      if (a.canPass && !b.canPass) {
        return -1;
      }
      if (!a.canPass && b.canPass) {
        return 1;
      }
      return a.person.firstName.toLocaleLowerCase().localeCompare(b.person.firstName.toLocaleLowerCase());
    });
    return result;
  }

}
