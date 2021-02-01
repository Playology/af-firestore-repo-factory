import {
  Action,
  AngularFirestore,
  CollectionReference,
  DocumentChangeAction,
  DocumentChangeType,
  DocumentData,
  DocumentReference,
  DocumentSnapshot,
  Query,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

import { FetchOptions } from './fetch-options';
import { FirestoreEntity } from './firestore-entity';

/**
 * A testable typed repository that simplifies access to Firebase Firestore using Angular Fire
 *
 * Not designed to be instantiated directly, use an injected FirestoreRepFactory to create an instance
 * for a sepcific path
 */
export class FirestoreRepo<T extends FirestoreEntity> {
  constructor(private angularFiretore: AngularFirestore, private collectionPath: string) {}

  /**
   * Adds an object to the collection
   *
   * @param item The item to be added
   * @param id Optional explicit id to use for the document
   */
  public async add(item: T, id?: string): Promise<T> {
    let docRef: DocumentReference<T>;
    if (!id) {
      docRef = await this.angularFiretore.collection<T>(this.collectionPath).add(item);
    } else {
      docRef = this.angularFiretore.collection<T>(this.collectionPath).doc(id).ref;
      await docRef.set(item);
    }
    return {
      ...(item as any),
      id: docRef.id,
    };
  }

  /**
   * Deletes and existing document from the collection
   *
   * @param id The id of the document to delete
   */
  public delete(id: string): Promise<void> {
    const docRef = this.angularFiretore.collection<T>(this.collectionPath).doc<T>(id);
    return docRef.delete();
  }

  /**
   * Indicates whether a document with the specified id exists
   * 
   * @param id The id of the document being checked
   */
  public async exists(id: string): Promise<boolean> {
    const docRef = this.angularFiretore.collection<T>(this.collectionPath).doc<T>(id);
    const doc = await docRef.ref.get();
    return doc.exists;
  }

  /**
   * Fetches an observable of the value changes for a collection of documents, optionally filtered and/or sorted
   *
   * IMPORTANT: There is no validation of the combination of filter or sort specifications it remains your responsibility
   * to understand Firebase querying limitations and index requirements and submit options that are valid
   *
   * @options Optional options for configuring the query submitted
   */
  public fetch(options: FetchOptions = {}): Observable<T[]> {
    return this.angularFiretore
      .collection<T>(this.collectionPath, (ref) => {
        const query = this.applyOptions(options, ref);
        return query || ref;
      })
      .valueChanges({ idField: 'id' });
  }

  /**
   * Fetches an observable of the snapshot changes for a collection of documents, optionally filtered and/or sorted
   *
   * IMPORTANT: There is no validation of the combination of filter or sort specifications it remains your responsibility
   * to understand Firebase querying limitations and index requirements and submit options that are valid
   *
   * @options Optional options for configuring the query submitted
   * @events Optional array of event types of interest
   */
  public fetchSnapshots(
    options: FetchOptions = {},
    events?: DocumentChangeType[]
  ): Observable<DocumentChangeAction<T>[]> {
    return this.angularFiretore
      .collection<T>(this.collectionPath, (ref) => {
        const query = this.applyOptions(options, ref);
        return query || ref;
      })
      .snapshotChanges(events);
  }

  /**
   * Gets an observable of the value changes for a single document
   *
   * @param id The id of the document to get
   */
  public get(id: string): Observable<T> {
    return this.angularFiretore
      .collection<T>(this.collectionPath)
      .doc<T>(id)
      .valueChanges({ idField: 'id' });
  }

  /**
   * Gets an observable of the snapshot changes for a single document
   *
   * @param id The id of the document to get
   */
  public getSnapshot(id: string): Observable<Action<DocumentSnapshot<T>>> {
    return this.angularFiretore.collection<T>(this.collectionPath).doc<T>(id).snapshotChanges();
  }

  /**
   * Updates an existing document
   *
   * @param item The document fragment to be updated
   */
  public update(item: Partial<T>): Promise<void> {
    const docRef = this.angularFiretore.collection<T>(this.collectionPath).doc(item.id);
    return docRef.update(item);
  }

  private applyFilters(
    options: FetchOptions,
    query: Query<DocumentData>,
    ref: CollectionReference<DocumentData>
  ) {
    if (options.filters && options.filters.length) {
      for (const filter of options.filters) {
        query = (query || ref).where(filter.fieldName, filter.operator, filter.value);
      }
    }
    return query;
  }

  private applyLimit(
    options: FetchOptions,
    query: Query<DocumentData>,
    ref: CollectionReference<DocumentData>
  ) {
    if (options.limit) {
      query = (query || ref).limit(options.limit);
    }
    return query;
  }

  private applyOptions(
    options: FetchOptions,
    ref: CollectionReference<DocumentData>
  ): Query<DocumentData> | null {
    let query: Query<DocumentData> = null as any;
    query = this.applyFilters(options, query, ref);
    query = this.applySorts(options, query, ref);
    query = this.applyLimit(options, query, ref);
    return query;
  }

  private applySorts(
    options: FetchOptions,
    query: Query<DocumentData>,
    ref: CollectionReference<DocumentData>
  ): Query<DocumentData> | null {
    if (options.sorts && options.sorts.length) {
      for (const sort of options.sorts) {
        query = (query || ref).orderBy(sort.fieldName, sort.direction);
      }
      if (typeof options.startAt !== 'undefined') {
        query = query.startAt(options.startAt);
      }
      if (typeof options.startAfter !== 'undefined') {
        query = query.startAfter(options.startAfter);
      }
      if (typeof options.endAt !== 'undefined') {
        query = query.endAt(options.endAt);
      }
      if (typeof options.endBefore !== 'undefined') {
        query = query.endBefore(options.endBefore);
      }
    }

    return query;
  }
}
