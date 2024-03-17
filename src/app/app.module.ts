import { FormsModule } from '@angular/forms';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';

import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getStorage, provideStorage } from '@angular/fire/storage';
import { getFunctions, provideFunctions } from '@angular/fire/functions';
import { getMessaging, provideMessaging } from '@angular/fire/messaging';
import { Drivers } from '@ionic/storage';
import { IonicStorageModule } from '@ionic/storage-angular';
import { ToastrModule } from 'ngx-toastr';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { environment } from '../environments/environment';
import { HammerGestureConfig, HAMMER_GESTURE_CONFIG } from '@angular/platform-browser';
import { ServiceWorkerModule } from '@angular/service-worker';
import { MainModule } from './main/main.module';
import { TeacherModule } from './teacher/teacher.module';
import { SessionModule } from './session/session.module';
import { CourseModule } from './course/course.module';


import { AppSettingsService } from 'src/app/service/AppSettingsService';
import { CourseService } from './service/CourseService';
import { ConnectedUserService } from './service/ConnectedUserService';
import { DateService } from './service/DateService';
import { NtaService } from './service/NtaService';
import { ParticipantQuestionAnswerService } from 'src/app/service/ParticipantQuestionAnswerService';
import { SessionService } from 'src/app/service/SessionService';
import { TranslationService } from 'src/app/service/TranslationService';
import { UserService } from 'src/app/service/UserService';
import { ToastrService } from 'ngx-toastr';
import { ToolService } from './service/ToolService';

export class CustomHammerConfig extends HammerGestureConfig {}

@NgModule({
    declarations: [AppComponent],
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        FormsModule,
        IonicModule.forRoot(),
        ToastrModule.forRoot(),
        AppRoutingModule,
        provideFirebaseApp(() => initializeApp(environment.firebaseConfig)),
        provideFirestore(() => getFirestore()),
        provideAuth(() => getAuth()),
        provideStorage(() => getStorage()),
        provideFunctions(() => getFunctions()),
        provideMessaging(() => getMessaging()),
        IonicStorageModule.forRoot({ name: '__mydb', driverOrder: [Drivers.IndexedDB, Drivers.LocalStorage] }),
        ServiceWorkerModule.register('ngsw-worker.js', { enabled: environment.production }),
        MainModule,
        TeacherModule,
        SessionModule,
        CourseModule
    ],
    providers: [
        { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
        AppSettingsService,
        ConnectedUserService,
        CourseService,
        DateService,
        NtaService,
        ParticipantQuestionAnswerService,
        SessionService,
        ToastrService,
        ToolService,
        TranslationService,
        UserService,
    ],
    bootstrap: [AppComponent]
})
export class AppModule {}
