import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';

import { FirestoreEntity } from './firestore-entity';
import { FirestoreRepo } from './firestore-repo';

@Injectable({
    providedIn: 'root'
})
export class FirestoreRepoFactory {
    constructor(private angularFirestore: AngularFirestore) {}

    public create<T extends FirestoreEntity>(collectionPath: string): FirestoreRepo<T> {
        return new FirestoreRepo<T>(this.angularFirestore, collectionPath);
    }
}

