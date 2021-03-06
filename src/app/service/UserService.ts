import { DataRegion } from './../model/model';
import { AngularFireFunctions } from '@angular/fire/functions';
import { LocalAppSettings } from './../model/settings';
import { AppSettingsService } from './AppSettingsService';
import { AlertController, ToastController, LoadingController, NavController } from '@ionic/angular';
import { UserCredential } from '@firebase/auth-types';

import { ResponseWithData, Response } from './response';
import { Observable, of, from, Subject, forkJoin } from 'rxjs';
import { ConnectedUserService } from './ConnectedUserService';
import { Injectable } from '@angular/core';
import { User, AuthProvider } from '../model/model';
import { RemotePersistentDataService } from './RemotePersistentDataService';
import { mergeMap, map, catchError } from 'rxjs/operators';
import { AngularFirestore, Query } from '@angular/fire/firestore';
import { AngularFireAuth } from '@angular/fire/auth';
import { ToolService } from './ToolService';
import { PersistentDataFilter } from './PersistentDataFonctions';

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
        private angularFireFunctions: AngularFireFunctions,
        private angularFireAuth: AngularFireAuth,
        private toolService: ToolService
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

    public save(user: User, cred: UserCredential = null): Observable<ResponseWithData<User>> {
        if (!user) {
            return of({data: null, error: { error : 'null user', errorCode: -1}});
        }
        const password = user.password;
        delete user.password;
        if (user.dataStatus === 'NEW') {
            let obs: Observable<UserCredential> = null;
            if (cred !== null  && (user.authProvider === 'FACEBOOK' || user.authProvider === 'GOOGLE')) {
                obs = of(cred);
            } else {
                obs = from(this.auth.createUserWithEmailAndPassword(user.email, password));
            }
            return obs.pipe(
                mergeMap((userCred: UserCredential) => {
                    // Store in application user datbase the firestore user id
                    this.logger.debug(() => 'User has been created on firebase with the id: ' + userCred.user.uid);
                    user.accountId = userCred.user.uid;
                    return super.save(user);
                }),
                mergeMap((ruser) => {
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
                mergeMap((ruser) => {
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

    public delete(id: string): Observable<Response> {
        // check the user to delete is the current user.
        if (this.connectedUserService.getCurrentUser().id !== id) {
            return of({error: {error: 'Not current user', errorCode: 1}});
        }
        // First delete user from database
        return super.delete(id).pipe(
            mergeMap( (res) => {
                if (res.error != null) {
                    console.log('Error on delete', res.error);
                    return of (res);
                } else {
                    // then delete the user from firestore user auth database
                    return from(this.angularFireAuth.currentUser).pipe(
                        mergeMap((user) => from(user.delete())),
                        map(() => {
                            return {error: null};
                        }),
                        // then disconnect user
                        map(() => {
                            this.connectedUserService.userDisconnected();
                            this.navController.navigateRoot('/user/login');
                            return {error: null};
                        }),
                        catchError((err) => {
                            console.error(err);
                            return of({error: err});
                        })
                    );
                }
            })
        );
    }

    public login(email: string, password: string): Observable<ResponseWithData<User>> {
        this.logger.debug(() => 'UserService.login(' + email + ', ' + password + ')');
        let credential = null;
        return from(this.auth.signInWithEmailAndPassword(email, password)).pipe(
            mergeMap( (cred: UserCredential) => {
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
            mergeMap(() => from(this.loadingController.create({ message: 'Auto login...', translucent: true}))),
            mergeMap( (ctrl) => {
                loading = ctrl;
                loading.present();
                return this.appSettingsService.get();
            }),
            mergeMap((settings: LocalAppSettings) => {
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
            mergeMap ( (ruser) => {
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
            mergeMap((appSettings) => {
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

    public authWith(authProvider: any, authName: AuthProvider): Observable<ResponseWithData<User>> {
        let credential = null;
        return from(this.angularFireAuth.signInWithPopup(authProvider)).pipe(
            mergeMap( (cred: UserCredential) => {
                credential = cred;
                this.logger.debug(() => 'authWith: cred=' + JSON.stringify(cred, null, 2));
                return this.getByEmail(cred.user.email);
            }),
            catchError((err) => {
                this.logger.error('authWith error: ', err);
                return of({ error: err, data: null});
            }),
            mergeMap( (ruser: ResponseWithData<User>) => {
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

    private createUserFromCredential(cred: UserCredential, authProvider: AuthProvider): User {
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
    public searchUsers(criteria: UserSearchCriteria):
            Observable<ResponseWithData<User[]>> {
        let q: Query = this.getCollectionRef();
        if (this.toolService.isValidString(criteria.region)) {
            console.log('filter by region ' + criteria.region);
            q = q.where('region', '==', criteria.region);
        }
        if (this.toolService.isValidString(criteria.country)) {
            console.log('filter by country ' + criteria.country);
            q = q.where('country', '==', criteria.country);
        }
        return super.filter(this.query(q, 'default'), this.getFilterByText(criteria.text));
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
    public getFilterByText(text: string): PersistentDataFilter<User> {
        const validText = text && text !== null  && text.trim().length > 0 ? text.trim() : null;
        return validText === null ? null : (user: User) => {
            return this.stringContains(validText, user.email)
                || this.stringContains(validText, user.firstName)
                || this.stringContains(validText, user.lastName);
        };
    }
}
export interface UserSearchCriteria {
    text?: string;
    region?: DataRegion;
    country?: string;
}
