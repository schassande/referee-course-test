export type PersistentDataUpdater<D> = (data: D) => D;
export type PersistentDataFilter<D> = (data: D) => boolean;
