import { AppSettingsService } from './AppSettingsService';
import { PersistentDataUpdater, PersistentDataFilter } from './PersistentDataFonctions';
import { Crud } from './crud';
import { PersistentData } from '../model/common';
import { Observable, of, from } from 'rxjs';
import { Response, ResponseWithData } from './response';
import { mergeMap, map, catchError } from 'rxjs/operators';
import { Firestore,
    collection,
    CollectionReference,
    deleteDoc,
    doc,
    DocumentReference,
    DocumentSnapshot,
    getDoc,
    getDocFromCache,
    getDocFromServer,
    getDocs,
    getDocsFromCache,
    getDocsFromServer,
    query,
    limit,
    QuerySnapshot,
    QueryDocumentSnapshot,
    Query,
    setDoc} from '@angular/fire/firestore';
import { ToastController } from '@ionic/angular';
import { DateService } from './DateService';
import { Category } from 'typescript-logging';
import { logService } from '../logging-config';

export abstract class RemotePersistentDataService<D extends PersistentData> implements Crud<D> {

    private fireStoreCollection: CollectionReference<D>;
    private preloaded = false;
    protected logger: Category;

    constructor(
        protected appSettingsService: AppSettingsService,
        protected db: Firestore,
        private toastController: ToastController
    ) {
        this.fireStoreCollection = collection(db, this.getLocalStoragePrefix()) as CollectionReference<D>;
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
        return from(getDoc<D>(doc<D>(this.fireStoreCollection, id))).pipe(
            catchError((err) => {
                return of({ error: err, data: null});
            }),
            map(this.docSnapToResponse.bind(this))
        );
    }

    protected adjustFieldOnLoad(item: D) {
    }

    protected adjustDate(d: any, dateService: DateService): Date {
        if (d && !(d instanceof Date) ) {
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
        return from(getDocFromCache<D>(doc<D>(this.fireStoreCollection, id))).pipe(
            map(this.docSnapToResponse.bind(this))
        );
    }

    public getUrlPathOfGet(id: number) {
        return '/' + id;
    }

    public save(data: D): Observable<ResponseWithData<D>> {
        if (data.dataStatus === 'REMOVED') {
            return of({ error : { errorCode: 1, error: null}, data });

        } else if (data.dataStatus === 'NEW') {
            data.dataStatus = 'CLEAN';
            data.creationDate = new Date();
            let docRef: DocumentReference<D>;
            // Create a document
            if (data.id) {
                docRef = doc(this.fireStoreCollection, data.id);
            } else {
                // Get its id and set the id field
                docRef = doc(this.fireStoreCollection);
                data.id = docRef.id;
            }
            this.logger.debug(() => 'DatabaseService[' + this.getLocalStoragePrefix() + ']: Creating objet with new id: ' + data.id);
            return this.manageWritePromise(setDoc(docRef, data), data);

        } else {
            this.logger.debug(() => 'DatabaseService[' + this.getLocalStoragePrefix() + ']: Saving: ' + data.id);
            data.dataStatus = 'CLEAN';
            data.lastUpdate = new Date();
            data.version ++;
            return this.manageWritePromise(setDoc(doc(this.fireStoreCollection, data.id), data), data);
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

    protected docSnapNTToResponse(docSnap: DocumentSnapshot<D>): ResponseWithData<D> {
        const data: D = docSnap && docSnap.exists ? docSnap.data() as D : null;
        // this.logger.debug(() => 'load item ' + docSnap.id + ' exists=' + docSnap.exists + ' + data=' + data);
        if (data) {
            // store id inside persistent object
            data.id = docSnap.id;
            this.adjustFieldOnLoad(data);
        }
        return { error: null, data};
    }

    protected docSnapToResponse(docSnap: DocumentSnapshot<D>): ResponseWithData<D> {
        const data: D = docSnap && docSnap.exists ? docSnap.data() : null;
        //this.logger.debug(() => 'load item ' + docSnap.id + ' exists=' + docSnap.exists + ', data=' + JSON.stringify(data, null, 2));
        if (data) {
            // store id inside persistent object
            data.id = docSnap.id;
            this.adjustFieldOnLoad(data);
        }
        return { error: null, data};
    }

    public all(options: 'default' | 'server' | 'cache' = 'default'): Observable<ResponseWithData<D[]>> {
        this.logger.debug(() => `DatabaseService[${this.getLocalStoragePrefix()}].all(${options})`);
        return this.query(this.fireStoreCollection, options);
    }

    public getCollectionRef() {
        return this.fireStoreCollection;
    }
    public getDocumentObservable(id: string): DocumentReference<D> {
        return doc<D>(this.fireStoreCollection, id);
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
    public getBaseQuery(): Query<D> {
        return query(this.fireStoreCollection);
    }
    public query(q: Query, options: 'default' | 'server' | 'cache' = 'default'): Observable<ResponseWithData<D[]>> {
        let adjustedOptions = options;
        return this.appSettingsService.get().pipe(
            mergeMap((las) => {
                if (adjustedOptions === 'default') {
                    adjustedOptions = las.forceOffline ? 'cache' : 'server';
                }
                this.logger.debug(() => 'query ' + JSON.stringify(adjustedOptions, null, 2));
                if (adjustedOptions === 'cache') {
                    return from(getDocsFromCache(query(q)) as Promise<QuerySnapshot<D>>);
                } else if (adjustedOptions === 'server') {
                    return from(getDocsFromServer(query(q)) as Promise<QuerySnapshot<D>>);
                } else {
                    return from(getDocs(query(q, limit(1))) as Promise<QuerySnapshot<D>>);
                }
            }),
            map((qs: QuerySnapshot<D>) => this.snapshotToObs(qs)),
            catchError((err) => {
                this.logger.error('', err);
                return of({ error: err, data: null});
            })
        );
    }

    public queryOne(q: Query, options: 'default' | 'server' | 'cache' = 'default'): Observable<ResponseWithData<D>> {
        let adjustedOptions = options;
        return this.appSettingsService.get().pipe(
            mergeMap((las) => {
                if (adjustedOptions === 'default') {
                    adjustedOptions = las.forceOffline ? 'cache' : 'server';
                }
                if (adjustedOptions === 'cache') {
                    return from(getDocsFromCache(query(q, limit(1))) as Promise<QuerySnapshot<D>>);
                } else if (adjustedOptions === 'server') {
                    return from(getDocsFromServer(query(q, limit(1))) as Promise<QuerySnapshot<D>>);
                } else {
                    return from(getDocs(query(q, limit(1))) as Promise<QuerySnapshot<D>>);
                }
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
            deleteDoc(doc(this.fireStoreCollection, id));
            return of({ error: null});
        } catch (err) {
            this.logger.error('', err);
            return of({ error: err});
        }
    }

    public update(id: string, updater: PersistentDataUpdater<D>): Observable<ResponseWithData<D>> {
        this.logger.debug(() => 'DatabaseService[' + this.getLocalStoragePrefix() + '].update(' + id + ')');
        return this.get(id).pipe(
            mergeMap((response: ResponseWithData<D>) => {
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
            return this.all('cache').pipe(
                mergeMap( (resL) => {
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
                        return this.all('server').pipe(mergeMap( (resR) =>  {
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
