import { Category } from 'typescript-logging';
import { AppSettingsService } from './AppSettingsService';
import { PersistentDataUpdater, PersistentDataFilter } from './PersistentDataFonctions';
import { Crud } from './crud';
import { PersistentData } from '../model/common';
import { Observable, of, from } from 'rxjs';
import { Response, ResponseWithData } from './response';
import { flatMap, map, catchError } from 'rxjs/operators';
import { ToastController } from '@ionic/angular';
import { DateService } from './DateService';
import { firestore } from 'firebase';
import { AngularFirestore,
        AngularFirestoreCollection,
        AngularFirestoreDocument,
        DocumentReference,
        DocumentSnapshot,
        Query,
        QueryDocumentSnapshot,
        QuerySnapshot } from '@angular/fire/firestore';
import { logService } from '../logging-config';

export abstract class RemotePersistentDataService<D extends PersistentData> implements Crud<D> {

    private fireStoreCollection: AngularFirestoreCollection<D>;
    private preloaded = false;
    protected logger: Category;

    constructor(
        protected appSettingsService: AppSettingsService,
        readonly db: AngularFirestore,
        private toastController: ToastController
    ) {
        this.fireStoreCollection = db.collection<D>(this.getLocalStoragePrefix());
        this.logger = new Category(this.getLocalStoragePrefix(), logService);
    }

    abstract getLocalStoragePrefix(): string;

    // ============================= //
    // CRUD Interface implementation //
    // ============================= //

    public get(id: string): Observable<ResponseWithData<D>> {
        if (id == null || id === '-1' || id === '') {
            return of({ error: null, data: null});
        }
        this.logger.debug(() => 'DatabaseService[' + this.getLocalStoragePrefix() + '].get(' + id + ')');
        return this.fireStoreCollection.doc<D>(id).get().pipe(
            catchError((err) => {
                return of({ error: err, data: null});
            }),
            map(this.docSnapToResponse.bind(this))
        );
    }

    protected adjustFieldOnLoad(item: D) {
    }

    protected adjustDate(d: any, dateService: DateService): Date {
        if (d === null) {
            return null;
        } else if (d && !(d instanceof Date) ) {
            if (typeof d === 'string') {
                return dateService.string2date(d as string);
            } else {
                return d.toDate();
            }
        } else {
            return d as Date;
        }
    }


    public localGet(id: string): Observable<ResponseWithData<D>> {
        return this.fireStoreCollection.doc<D>(id).get({source: 'cache'}).pipe(
            map(this.docSnapToResponse.bind(this))
        );
    }

    public getUrlPathOfGet(id: number) {
        return '/' + id;
    }

    public createId(): string {
        return this.db.createId();
    }
    public save(data: D): Observable<ResponseWithData<D>> {
        if (data.dataStatus === 'REMOVED') {
            return of({ error : { errorCode: 1, error: null}, data });

        } else if (data.dataStatus === 'NEW') {
            data.dataStatus = 'CLEAN';
            data.creationDate = new Date();
            // Create a document
            if (!data.id) {
                data.id = this.createId();
            }
            const docRef = this.fireStoreCollection.doc(data.id);
            // Get its id and set the id field
            this.logger.debug(() => 'DatabaseService[' + this.getLocalStoragePrefix() + ']: Creating objet with new id: ' + data.id);
            return this.manageWritePromise(docRef.set(data), data);

        } else {
            this.logger.debug(() => 'DatabaseService[' + this.getLocalStoragePrefix() + ']: Saving: ' + data.id);
            data.dataStatus = 'CLEAN';
            data.lastUpdate = new Date();
            data.version ++;
            return this.manageWritePromise(this.fireStoreCollection.doc(data.id).update(data), data);
        }
    }

    manageWritePromise(promise: any, data: D): Observable<ResponseWithData<D>> {
        if (this.appSettingsService.settings.forceOffline) {
            this.logger.debug(() => 'DatabaseService[' + this.getLocalStoragePrefix() + '](' + data.id
                 + '): offline mode, remote action is queued.');
            // store the data but don't wait the end because the promise is resolved only when data are store on remote server
            promise.then((value) => {
                // TODO emit an event to show data are synchronised.
                this.logger.debug(() => 'DatabaseService[' + this.getLocalStoragePrefix() + '](' + data.id + ') data pushed on server.');
            });
            return of({ error: null, data});
        } else {
            this.logger.debug(() => 'DatabaseService[' + this.getLocalStoragePrefix() + '](' + data.id
                + '): online mode, wait server response.');
            // Online mode, wait server response
            return from(promise).pipe(
                map( () => {
                    this.logger.debug(() => 'DatabaseService[' + this.getLocalStoragePrefix() + '](' + data.id
                         + ') data pushed on server now.');
                    return { error: null, data};
                }),
                catchError((err) => {
                    return of ({ error: err, data: null});
                })
            );
        }
    }

    private docToObs(prom: Promise<DocumentReference>): Observable<ResponseWithData<D>> {
        return from(prom).pipe(
            flatMap( (value: DocumentReference) => {
                return from(value.get());
            }),
            catchError((err) => {
                this.logger.error('', err);
                return of({ error: err, data: null});
            }),
            map(this.docSnapToResponse.bind(this))
        );
    }

    protected docSnapNTToResponse(docSnap: firestore.DocumentSnapshot): ResponseWithData<D> {
        const data: D = docSnap && docSnap.exists ? docSnap.data() as D : null;
        this.logger.debug(() => 'load item ' + docSnap.id + ' exists=' + docSnap.exists + ' + data=' + data);
        if (data) {
            // store id inside persistent object
            data.id = docSnap.id;
            this.adjustFieldOnLoad(data);
        }
        return { error: null, data};
    }

    protected docSnapToResponse(docSnap: DocumentSnapshot<D>): ResponseWithData<D> {
        const data: D = docSnap && docSnap.exists ? docSnap.data() : null;
        this.logger.debug(() => 'load item ' + docSnap.id + ' exists=' + docSnap.exists + ', data=' + JSON.stringify(data, null, 2));
        if (data) {
            // store id inside persistent object
            data.id = docSnap.id;
            this.adjustFieldOnLoad(data);
        }
        return { error: null, data};
    }

    private voidToObs(prom: Promise<void>, data: D): Observable<ResponseWithData<D>> {
        return from(prom).pipe(
            catchError((err) => {
                this.logger.error('', err);
                return of({ error: err, data: null});
            }),
            map(() => {
                this.logger.debug(() => 'DatabaseService[' + this.getLocalStoragePrefix() + '].voidToObs(' + data.id + ')');
                return { error: null, data};
            })
        );
    }
    public all(): Observable<ResponseWithData<D[]>> {
        this.logger.debug(() => 'DatabaseService[' + this.getLocalStoragePrefix() + '].all()');
        return from(this.getCollectionRef().get()).pipe(
            map((qs: QuerySnapshot<D>) => this.snapshotToObs(qs)),
            catchError((err) => {
                this.logger.error('', err);
                return of({ error: err, data: null});
            })
        );
    }
    public allO(options: 'default' | 'server' | 'cache'): Observable<ResponseWithData<D[]>> {
        this.logger.debug(() => `DatabaseService[${this.getLocalStoragePrefix()}].all(${options})`);
        let adjustedOptions = options;
        return this.appSettingsService.get().pipe(
            flatMap((las) => {
                if (adjustedOptions === 'default') {
                    adjustedOptions = las.forceOffline ? 'cache' : 'server';
                }
                return from(this.getCollectionRef().get({ source: adjustedOptions}));
            }),
            map((qs: QuerySnapshot<D>) => this.snapshotToObs(qs)),
            catchError((err) => {
                this.logger.error('', err);
                return of({ error: err, data: null});
            })
        );
    }

    public getCollectionRef() {
        return this.fireStoreCollection.ref;
    }
    public getDocumentObservable(id: string): AngularFirestoreDocument<D> {
        return this.fireStoreCollection.doc<D>(id);
    }

    protected snapshotToObs(qs: QuerySnapshot<D>): ResponseWithData<D[]> {
        const datas: D[] = [];
        qs.forEach((qds: QueryDocumentSnapshot<D>) => {
            const data: D = qds.data();
            if (data) {
                // store id inside persistent object
                data.id = qds.id;
                this.adjustFieldOnLoad(data);
            }
            datas.push(data);
        });
        return { error: null, data: datas };
    }

    private snapshotOneToObs(qs: QuerySnapshot<D>): ResponseWithData<D> {
        const datas: D[] = [];
        qs.forEach((qds: QueryDocumentSnapshot<D>) => {
            const data: D = qds.data();
            if (data) {
                // store id inside persistent object
                data.id = qds.id;
                this.adjustFieldOnLoad(data);
            }
            datas.push(data);
        });
        if (datas.length > 0) {
            return { error: null, data: datas[0] };
        } else {
            return { error: null, data: null };
        }
    }

    public query(query: Query, options: 'default' | 'server' | 'cache'): Observable<ResponseWithData<D[]>> {
        let adjustedOptions = options;
        return this.appSettingsService.get().pipe(
            flatMap((las) => {
                if (adjustedOptions === 'default') {
                    adjustedOptions = las.forceOffline ? 'cache' : 'server';
                }
                this.logger.debug(() => 'query' + JSON.stringify(adjustedOptions, null, 2));
                return from(query.get({ source: adjustedOptions}));
            }),
            map((qs: QuerySnapshot<D>) => this.snapshotToObs(qs)),
            catchError((err) => {
                this.logger.error('', err);
                return of({ error: err, data: null});
            })
        );
    }

    public queryOne(query: Query, options: 'default' | 'server' | 'cache'): Observable<ResponseWithData<D>> {
        let adjustedOptions = options;
        return this.appSettingsService.get().pipe(
            flatMap((las) => {
                if (adjustedOptions === 'default') {
                    adjustedOptions = las.forceOffline ? 'cache' : 'server';
                }
                return from(query.limit(1).get({ source: options}));
            }),
            catchError((err) => {
                this.logger.error('', err);
                return of({ error: err, data: null});
            }),
            map(this.snapshotOneToObs.bind(this))
        );
    }

    public delete(id: string): Observable<Response> {
        this.logger.debug(() => 'DatabaseService[' + this.getLocalStoragePrefix() + '].delete(' + id + ')');
        try {
            this.fireStoreCollection.doc(id).delete();
            return of({ error: null});
        } catch (err) {
            this.logger.error('', err);
            return of({ error: err});
        }
    }

    public update(id: string, updater: PersistentDataUpdater<D>): Observable<ResponseWithData<D>> {
        this.logger.debug(() => 'DatabaseService[' + this.getLocalStoragePrefix() + '].update(' + id + ')');
        return this.get(id).pipe(
            flatMap((response: ResponseWithData<D>) => {
                if (response.error) {
                    return of(response);
                } else {
                    response.data = updater(response.data);
                    return this.save(response.data);
                }
            })
        );
    }

    protected filter(obs: Observable<ResponseWithData<D[]>>, filter: PersistentDataFilter<D>) {
        return obs.pipe(
            map((result: ResponseWithData<D[]>) => {
                if (!result.error && filter !== null) {
                    result.data = result.data.filter( (elem: D) => filter(elem));
                }
                return result;
            })
        );
    }

    protected stringContains(elem: string, text: string): boolean {
        return elem && text && text.toLowerCase().indexOf(elem.toLowerCase()) >= 0;
    }

    public preload(): Observable<Response> {
        if (this.preloaded) {
            this.logger.debug(() => 'preload[' + this.getLocalStoragePrefix() + ']: already cached');
            return of({ error: null});
        } else {
            let toast = null;
            return this.allO('cache').pipe(
                flatMap( (resL) => {
                    if (resL.data.length === 0) {
                        this.logger.debug(() => 'preload[' + this.getLocalStoragePrefix() + ']: Loading from server');
                        this.toastController.dismiss().then(() => {
                            this.toastController.create({ message: 'Loading ' + this.getLocalStoragePrefix() + 's...', position: 'bottom'})
                                .then((alert) => {
                                    toast = alert;
                                    alert.present();
                                });
                            });
                        // load from server
                        return this.allO('server').pipe(flatMap( (resR) =>  {
                            this.preloaded = true;
                            this.toastController.dismiss();
                            return of({ error: null});
                        }));
                    } else {
                        this.logger.debug(() => 'preload[' + this.getLocalStoragePrefix() + ']: already cached by firestore');
                        this.preloaded = true;
                        return of({ error: null});
                    }
                }),
                catchError((err) => {
                    this.logger.error('', err);
                    return of({ error: err});
                })
            ).pipe(
                map((res) => {
                    if (toast !== null) {
                        toast.dismiss();
                    }
                    return res;
                })
            );
        }
    }
    protected mergeObservables(list: ResponseWithData<D[]>[], unique = false): ResponseWithData<D[]> {
        const res = {data: [], error : null};
        const ids = new Set<string>();
        list.forEach( (item) => {
          if (item.data) {
            item.data.forEach( (d: D) => {
                if (!unique || !ids.has(d.id)) {
                    this.adjustFieldOnLoad(d);
                    res.data.push(d);
                    if (unique) {
                        ids.add(d.id);
                    }
                }
            });
          }
          if (item.error) {
            res.error = item.error;
          }
        });
        return res;
    }
}
