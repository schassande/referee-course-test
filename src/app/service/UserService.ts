import { DataRegion } from './../model/model';
import { AngularFireFunctions } from '@angular/fire/functions';
import { LocalAppSettings } from './../model/settings';
import { AppSettingsService } from './AppSettingsService';
import { AlertController, ToastController, LoadingController, NavController } from '@ionic/angular';

import { ResponseWithData, Response } from './response';
import { Observable, of, from, Subject, forkJoin } from 'rxjs';
import { ConnectedUserService } from './ConnectedUserService';
import { Injectable } from '@angular/core';
import { User, AuthProvider, COUNTRIES } from '../model/model';
import { RemotePersistentDataService } from './RemotePersistentDataService';
import * as firebase from 'firebase/app';
import { flatMap, map, catchError } from 'rxjs/operators';
import { AngularFirestore, Query } from '@angular/fire/firestore';
import { AngularFireAuth } from '@angular/fire/auth';

@Injectable()
export class UserService  extends RemotePersistentDataService<User> {

    constructor(
        readonly db: AngularFirestore,
        toastController: ToastController,
        private connectedUserService: ConnectedUserService,
        appSettingsService: AppSettingsService,
        private alertCtrl: AlertController,
        private functions: AngularFireFunctions,
        private loadingController: LoadingController,
        private navController: NavController,
        private auth: AngularFireAuth,
        private angularFireFunctions: AngularFireFunctions
    ) {
        super(appSettingsService, db, toastController);
    }

    getLocalStoragePrefix(): string {
        return 'User';
    }

    getPriority(): number {
        return 1;
    }

    protected adjustFieldOnLoad(item: User) {
        if (item.dataRegion === undefined || item.dataRegion === null) {
            item.dataRegion = 'Europe';
        }
    }

    public save(user: User, cred: firebase.auth.UserCredential = null): Observable<ResponseWithData<User>> {
        if (!user) {
            return of({data: null, error: { error : 'null user', errorCode: -1}});
        }
        const password = user.password;
        delete user.password;
        if (user.dataStatus === 'NEW') {
            let obs: Observable<firebase.auth.UserCredential> = null;
            if (cred !== null  && (user.authProvider === 'FACEBOOK' || user.authProvider === 'GOOGLE')) {
                obs = of(cred);
            } else {
                obs = from(this.auth.createUserWithEmailAndPassword(user.email, password));
            }
            return obs.pipe(
                flatMap((userCred: firebase.auth.UserCredential) => {
                    // Store in application user datbase the firestore user id
                    this.logger.debug(() => 'User has been created on firebase with the id: ' + userCred.user.uid);
                    user.accountId = userCred.user.uid;
                    return super.save(user);
                }),
                flatMap((ruser) => {
                    if (ruser.data) {
                        this.logger.debug(() => 'User has been created on user database with the id: ' + ruser.data.id);
                        // Send an email to admin with the account to validate
                        this.sendNewAccountToAdmin(ruser.data.id);
                        this.sendNewAccountToUser(ruser.data.id);
                        return this.appSettingsService.setLastUserObs(user.email, password).pipe(
                            map(() => ruser)
                        );
                    } else {
                        this.logger.debug(() => 'Error on the user creation: ' + ruser.error);
                        throw new Error('' + ruser.error);
                    }
                }),
                flatMap((ruser) => {
                    // Autologin if the user is active
                    if (ruser.data.accountStatus === 'ACTIVE') {
                        return this.autoLogin();
                    }
                }),
                catchError((err) => {
                    this.logger.error('Error on the user creation: ', err);
                    return of({ error: err, data: null});
                }),
            );
        } else {
            return super.save(user);
        }
    }

    public deleteUser(user: User): Observable<Response> {
        this.logger.debug(() => 'UserService.deleteUser(appId=' + user.id + ', firebaseId=' + user.accountId + ')');
        // check the user to delete is the current user.
        if (this.connectedUserService.getCurrentUser().id !== user.id) {
            return of({error: {error: 'Not current user', errorCode: 1}});
        }
        // Check the user to delete is the current auth user
        let userfb: firebase.User = null;
        return from(this.auth.currentUser).pipe(
            map((userFB: firebase.User) => {
                userfb = userFB;
                if (!userfb) {
                    throw new Error('Error on delete: this.auth.user return invalid user: ' + userfb);
                    return of({ error: { error : 'Technical Error', errorCode: 99, code: '' }});
                } else if (userfb.uid !== user.accountId) {
                    throw new Error('Error on delete: this.auth.user.uid (' + userfb.uid
                        + ') different from user.accountId (' + user.accountId + ')');
                }
                return userfb;
            }),
            // First delete user from database
            flatMap(() => super.delete(user.id)),
            map((res) => {
                if (res.error != null) {
                    this.logger.debug(() => 'Error on delete: ' + res.error);
                    throw res.error;
                }
                return res;
            }),
            // then delete Firebase user
            flatMap((res) => {
                this.logger.debug(() => 'delete firebase user ' + user.accountId);
                return from(userfb.delete());
            }),
            // then disconnect user
            map(() => {
                this.connectedUserService.userDisconnected();
                this.navController.navigateRoot('/user/login');
                return {error: null};
            }),
            catchError((err) => {
                this.logger.error('Error on delete: ' + err, err);
                return of({ error: { error : err, errorCode: 99, code: 'Technical error' } });
            })
        );
    }

    public login(email: string, password: string): Observable<ResponseWithData<User>> {
        this.logger.debug(() => 'UserService.login(' + email + ', ' + password + ')');
        let credential = null;
        return from(this.auth.signInWithEmailAndPassword(email, password)).pipe(
            flatMap( (cred: firebase.auth.UserCredential) => {
                credential = cred;
                this.logger.debug(() => 'login: cred=' + JSON.stringify(cred, null, 2));
                return this.getByEmail(email);
            }),
            catchError((err) => {
                this.logger.error('UserService.login(' + email + ', ' + password + ') error=', err);
                this.loadingController.dismiss(null);
                console.error(err);
                if (err.code !== 'auth/network-request-failed') {
                    this.alertCtrl.create({message: err.message}).then((alert) => alert.present());
                }
                return of({ error: err, data: null});
            }),
            map( (ruser: ResponseWithData<User>) => {
                this.logger.debug(() => 'UserService.login(' + email + ', ' + password + ') ruser=' + JSON.stringify(ruser, null, 2));
                if (ruser.data) {
                    switch (ruser.data.accountStatus) {
                    case 'ACTIVE':
                        this.connectedUserService.userConnected(ruser.data, credential);
                        break;
                    case 'DELETED':
                        ruser.data = null;
                        ruser.error = { error : 'The account \'' + email + '\' has been removed. Please contact the administrator.',
                                        errorCode : 1234 };
                        break;
                    case 'LOCKED':
                        ruser.data = null;
                        ruser.error = { error : 'The account \'' + email + '\' has been locked. Please contact the administrator.',
                                        errorCode : 1234 };
                        break;
                    case 'VALIDATION_REQUIRED':
                        ruser.data = null;
                        ruser.error = { error : 'A validation is still required for the account \'' + email + '\'.',
                                        errorCode : 1234 };
                        break;
                    }
                } else if (!ruser.error) {
                    const msg = 'Unexpected problem, please contact the administrator with the following data: '
                        + '<br>server response: ' + JSON.stringify(ruser)
                        + '<br>credential: ' + JSON.stringify(credential);
                    console.error(msg);
                    this.alertCtrl.create({message: msg}).then((alert) => alert.present());
                    ruser.error = { error : msg, errorCode : 1234 };
                }
                return ruser;
            })
        );
    }

    public logout() {
        this.logger.info(() => 'UserService.logout()');
        this.connectedUserService.userDisconnected();
    }

    private dismissLoadingWindow(): Observable<any> {
        return from(this.loadingController.getTop().then(ctrl => ctrl ? from(ctrl.dismiss()) : of('')));
    }

    /**
     * Try to autologin an user with data stored from local storage.
     */
    public autoLogin(): Observable<ResponseWithData<User>> {
        let loading = null;
        return this.dismissLoadingWindow().pipe(
            flatMap(() => from(this.loadingController.create({ message: 'Auto login...', translucent: true}))),
            flatMap( (ctrl) => {
                loading = ctrl;
                loading.present();
                return this.appSettingsService.get();
            }),
            flatMap((settings: LocalAppSettings) => {
                const email = settings.lastUserEmail;
                const password = settings.lastUserPassword;
                this.logger.debug(() => 'UserService.autoLogin(): lastUserEmail=' + email + ', lastUserPassword=' + password);
                if (!email) {
                    loading.dismiss();
                    return of({ error: null, data: null});
                }
                if (!this.connectedUserService.isOnline() || settings.forceOffline) {
                    this.logger.debug(() => 'UserService.autoLogin(): offline => connect with email only');
                    loading.dismiss();
                    return this.connectByEmail(email, password);
                }
                if (password) {
                    // password is defined => try to login
                    this.logger.debug(() => 'UserService.autoLogin(): login(' + email + ', ' + password + ')');
                    return this.login(email, password).pipe(
                        map((ruser) =>  {
                            loading.dismiss();
                            return ruser;
                        })
                    );
                }
                loading.dismiss();
                return of({data: null, error: null});
            })
        );
    }

    public resetPassword(email, sub: Subject<ResponseWithData<User>> = null) {
        this.logger.debug(() => 'Reset password of the account ' + email);
        this.auth.sendPasswordResetEmail(email).then(() => {
            this.alertCtrl.create({message: 'An email has been sent to \'' + email + '\' to reset the password.'})
                .then((alert) => alert.present());
            if (sub) {
                sub.next({ error: null, data: null});
                sub.complete();
            }
        });
    }

    public loginWithEmailNPassword(email: string,
                                   password: string,
                                   savePassword: boolean): Observable<ResponseWithData<User>> {
        this.logger.debug(() => 'loginWithEmailNPassword(' + email + ', ' + password + ', ' + savePassword + ')');
        return this.login(email, password).pipe(
            flatMap ( (ruser) => {
                if (ruser.error) {
                    // login failed
                    savePassword = false; // don't save the password if error occurs
                    if (ruser.error.code === 'auth/network-request-failed') {
                        // no network => check the email/password with local storage
                        return this.connectByEmail(email, password);
                    }
                }
                return of(ruser);
            }),
            map( (ruser) => {
                if (ruser.data) { // Login with success
                    this.logger.debug(() => 'UserService.loginWithEmailNPassword(' + email + '): login with success');
                    if (savePassword) {
                        this.logger.debug(() => 'UserService.askPasswordToLogin(' + email + '): store password.');
                        // The user is ok to store password in settings on local device
                        this.appSettingsService.setLastUser(email, password);
                    }
                }
                return ruser;
            })
        );
    }

    private connectByEmail(email: string, password: string = null): Observable<ResponseWithData<User>> {
        return this.appSettingsService.get().pipe(
            flatMap((appSettings) => {
                if (email === appSettings.lastUserEmail && (password == null || password === appSettings.lastUserPassword)) {
                    this.logger.debug(() => 'UserService.connectByEmail(' + email + ',' + password + '): password is valid => get user');
                    return this.getByEmail(email);
                } else {
                    this.logger.debug(() => 'UserService.connectByEmail(' + email + ',' + password + '): wrong password.');
                    return of({ error: null, data: null });
                }
            }),
            map( (ruser: ResponseWithData<User>) => {
                if (ruser.data) {
                    this.logger.debug(() => 'UserService.connectByEmail(' + email + ',' + password + '): user found'
                        + JSON.stringify(ruser.data, null, 2));
                    this.connectedUserService.userConnected(ruser.data, null);
                } else {
                    this.logger.debug(() => 'UserService.connectByEmail(' + email + ',' + password + '): fail.');
                }
                return ruser;
            })
        );
}
    public getUrlPathOfGet(id: number) {
        return '?id=' + id;
    }

    public getByEmail(email: string): Observable<ResponseWithData<User>> {
        return this.queryOne(this.getCollectionRef().where('email', '==', email), 'default').pipe(
            map((ruser => {
                this.logger.debug(() => 'UserService.getByEmail(' + email + ')=' + JSON.stringify(ruser.data, null, 2));
                return ruser;
            })),
            catchError((err) => {
                return of({ error: err, data: null});
            }),
        );
    }
    public findByShortName(shortName: string): Observable<ResponseWithData<User[]>> {
        return this.query(this.getCollectionRef().where('shortName', '==', shortName), 'default');
    }

    public authWithGoogle(): Observable<ResponseWithData<User>> {
        return this.authWith(new firebase.auth.GoogleAuthProvider(), 'GOOGLE');
    }

    public authWithFacebook(): Observable<ResponseWithData<User>> {
        return this.authWith(new firebase.auth.FacebookAuthProvider(), 'FACEBOOK');
    }

    public authWith(authProvider: any, authName: AuthProvider): Observable<ResponseWithData<User>> {
        let credential = null;
        return from(firebase.auth().signInWithPopup(authProvider)).pipe(
            flatMap( (cred: firebase.auth.UserCredential) => {
                credential = cred;
                this.logger.debug(() => 'authWith: cred=' + JSON.stringify(cred, null, 2));
                return this.getByEmail(cred.user.email);
            }),
            catchError((err) => {
                this.logger.error('authWith error: ', err);
                return of({ error: err, data: null});
            }),
            flatMap( (ruser: ResponseWithData<User>) => {
                if (!ruser.data) {
                    return this.save(this.createUserFromCredential(credential, authName), credential);
                } else {
                    return of(ruser);
                }
            }),
            map( (ruser: ResponseWithData<User>) => {
                this.logger.debug(() => 'authWith user: ' + JSON.stringify(ruser));
                if (ruser.data) {
                    this.connectedUserService.userConnected(ruser.data, credential);
                }
                return ruser;
            })
        );
    }

    private createUserFromCredential(cred: firebase.auth.UserCredential, authProvider: AuthProvider): User {
        if (!cred || !cred.user) {
            return null;
        }
        const names = cred.user.displayName.split(' ');
        const firstName: string = names[0];
        const lastName: string = names.length > 1 ? names[1] : ' ';
        return {
            id: null,
            accountId: cred.user.uid,
            accountStatus: 'VALIDATION_REQUIRED',
            role: 'LEARNER',
            authProvider,
            version: 0,
            creationDate : new Date(),
            lastUpdate : new Date(),
            dataStatus: 'NEW',
            firstName,
            lastName,
            email: cred.user.email,
            gender: 'M',
            mobilePhones: [ ],
            photo: {
              path: null,
              url: null
            },
            speakingLanguages: [ 'EN' ],
            password: '',
            token: null,
            dataRegion: 'Europe',
            dataSharingAgreement: {
              personnalInfoSharing: 'YES',
              photoSharing: 'YES'
            },
            phone: '',
            club: null,
            teacherQualifications: []
        } as User;
    }
    public sendNewAccountToAdmin(userId: string): Observable<any> {
        return this.angularFireFunctions.httpsCallable('sendNewAccountToAdmin')({userId});
    }
    public sendNewAccountToUser(userId: string): Observable<any> {
        return this.angularFireFunctions.httpsCallable('sendNewAccountToUser')({userId});
    }
    public sendAccountValidated(userId: string): Observable<any> {
        return this.angularFireFunctions.httpsCallable('sendAccountValidated')({userId});
    }
    public sendAccountNotValidated(userId: string): Observable<any> {
        return this.angularFireFunctions.httpsCallable('sendAccountNotValidated')({userId});
    }

    public sortUsers(users: User[]): User[] {
        if (users) {
            users.sort((u1, u2) => {
                let res = u1.firstName.localeCompare(u2.firstName);
                if (res === 0) {
                    res = u1.lastName.localeCompare(u2.lastName);
                }
                return res;
            });
        }
        return users;
    }

    public findTeachers(text: string, region: DataRegion): Observable<ResponseWithData<User[]>> {
        return forkJoin([
            this.query(this.getCollectionRef()
                .where('dataRegion', '==', region)
                .where('role', '==', 'ADMIN'), 'default'),
            this.query(this.getCollectionRef()
                .where('dataRegion', '==', region)
                .where('role', '==', 'TEACHER'), 'default')]
        ).pipe(
            map((list) => this.mergeObservables(list)),
            map(ruser => {
                const str = text !== null && text && text.trim().length > 0 ? text.trim() : null;
                if (ruser.data && str) {
                    ruser.data = ruser.data.filter((u) => {
                        return this.stringContains(str, u.firstName)
                        || this.stringContains(str, u.lastName)
                        || this.stringContains(str, u.email);
                    });
                }
                return ruser;
            })
        );
    }

    public userToPersonRef(user: User) {
        return { personId: user.id,
          firstName: user.firstName,
          lastName: user.lastName};
    }

    public notifyNewTeacher(userId: string): Observable<Response> {
        this.logger.debug(() => 'notifyNewTeacher(userId=' + userId + ')');
        const callable = this.functions.httpsCallable('notifyNewTeacher');
        return callable({ userId });
    }

    public askToBecomeTeacher(learnerId: string, teacherId: string): Observable<Response> {
        this.logger.debug(() => 'askToBecomeTeacher(learnerId=' + learnerId + ', teacherId=' + teacherId + ')');
        const callable = this.functions.httpsCallable('askToBecomeTeacher');
        return callable({ learnerId, teacherId });
    }
}
