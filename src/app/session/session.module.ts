
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { MainModule } from 'src/app/main/main.module';

import { SessionRoutingModule } from './session-routing.module';
import { SessionEditComponent } from './session-edit/session-edit.component';
import { SessionListComponent } from './session-list/session-list.component';
import { SessionPlayComponent } from './session-play/session-play.component';
import { SessionAnalyseComponent } from './session-analyse/session-analyse.component';
import { SessionLearnerAnalyseComponent } from './session-learner-analyse/session-learner-analyse.component';

@NgModule({
    imports: [CommonModule, FormsModule, IonicModule, SessionRoutingModule],
    declarations: [
        SessionEditComponent,
        SessionListComponent,
        SessionPlayComponent,
        SessionAnalyseComponent,
        SessionLearnerAnalyseComponent
    ]
})
export class SessionModule {}
