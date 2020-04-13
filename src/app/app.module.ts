import { FormsModule } from '@angular/forms';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';

import { AngularFireModule } from '@angular/fire';
import { AngularFirestoreModule } from '@angular/fire/firestore';
import { AngularFireAuthModule } from '@angular/fire/auth';
import { AngularFireStorageModule } from '@angular/fire/storage';
import { AngularFireFunctionsModule } from '@angular/fire/functions';
import { AngularFireMessagingModule } from '@angular/fire/messaging';
import { IonicStorageModule } from '@ionic/storage';

import { environment } from '../environments/environment';
import { HammerGestureConfig, HAMMER_GESTURE_CONFIG } from '@angular/platform-browser';
import { ServiceWorkerModule } from '@angular/service-worker';
import { MainModule } from './main/main.module';
import { TeacherModule } from './teacher/teacher.module';
import { SessionModule } from './session/session.module';
import { CourseModule } from './course/course.module';

export class CustomHammerConfig extends HammerGestureConfig {}



@NgModule({
  declarations: [AppComponent],
  entryComponents: [],
  imports: [
    BrowserModule,
    FormsModule,
    IonicModule.forRoot(),
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
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
