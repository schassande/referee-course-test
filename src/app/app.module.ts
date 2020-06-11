import { FormsModule } from '@angular/forms';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';

import { AngularFireModule } from '@angular/fire';
import { AngularFirestoreModule } from '@angular/fire/firestore';
import { AngularFireAuthModule } from '@angular/fire/auth';
import { AngularFireStorageModule } from '@angular/fire/storage';
import { AngularFireFunctionsModule, REGION, ORIGIN } from '@angular/fire/functions';
import { AngularFireMessagingModule } from '@angular/fire/messaging';
import { IonicStorageModule } from '@ionic/storage';
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
import { ClubService } from './service/ClubService';
import { DateService } from './service/DateService';
import { NtaService } from './service/NtaService';
import { ParticipantQuestionAnswerService } from 'src/app/service/ParticipantQuestionAnswerService';
import { SessionService } from 'src/app/service/SessionService';
import { TranslationService } from 'src/app/service/TranslationService';
import { UserService } from 'src/app/service/UserService';
import { ToastrService } from 'ngx-toastr';

export class CustomHammerConfig extends HammerGestureConfig {}

@NgModule({
  declarations: [AppComponent],
  entryComponents: [],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    IonicModule.forRoot(),
    ToastrModule.forRoot(),
    AppRoutingModule,
    AngularFireModule.initializeApp(environment.firebaseConfig),
    AngularFirestoreModule,
    AngularFireAuthModule,
    AngularFireFunctionsModule,
    AngularFireStorageModule,
    AngularFireMessagingModule,
    IonicStorageModule.forRoot({ name: '__mydb', driverOrder: ['indexeddb', 'sqlite', 'websql'] }),
    ServiceWorkerModule.register('ngsw-worker.js', { enabled: environment.production }),
    MainModule,
    TeacherModule,
    SessionModule,
    CourseModule
  ],
  providers: [
    StatusBar,
    SplashScreen,
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    // { provide: REGION, useValue: 'us-central1' },
    // { provide: ORIGIN, useValue: 'http://localhost:5005' },
    AppSettingsService,
    ClubService,
    ConnectedUserService,
    CourseService,
    DateService,
    NtaService,
    ParticipantQuestionAnswerService,
    SessionService,
    ToastrService,
    TranslationService,
    UserService,
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
