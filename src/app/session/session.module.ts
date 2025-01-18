
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import {MatIconModule} from '@angular/material/icon';
import {MatSelectModule} from '@angular/material/select';

import { SessionRoutingModule } from './session-routing.module';
import { SessionEditComponent } from './session-edit/session-edit.component';
import { SessionListComponent } from './session-list/session-list.component';
import { SessionPlayComponent } from './session-play/session-play.component';
import { SessionAnalyseComponent } from './session-analyse/session-analyse.component';
import { SessionLearnerAnalyseComponent } from './session-learner-analyse/session-learner-analyse.component';
import { HttpClientModule } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { LearnerResultPipePipe } from './learner-result-pipe.pipe';

@NgModule({
    imports: [CommonModule, FormsModule, IonicModule, 
        MatIconModule, MatSelectModule,
        HttpClientModule,
        SessionRoutingModule,
        TranslateModule.forChild({extend: true})
    ],
    declarations: [
        SessionEditComponent,
        SessionListComponent,
        SessionPlayComponent,
        SessionAnalyseComponent,
        SessionLearnerAnalyseComponent,
        LearnerResultPipePipe
    ]
})
export class SessionModule {}
