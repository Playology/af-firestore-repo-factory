import { TestBed } from '@angular/core/testing';
import { AngularFireModule } from '@angular/fire';
import { AngularFirestore, AngularFirestoreModule } from '@angular/fire/firestore';

import { firebaseConfig } from '../firebase-config';
import { FilterSpecification } from './filter-specification';
import { FirestoreEntity } from './firestore-entity';
import { FirestoreRepo } from './firestore-repo';
import { FirestoreRepoFactory } from './firestore-repo-factory.service';
import { SortSpecification } from './sort-specification';

export interface TestEntity extends FirestoreEntity {
  name: string;
  timeStamp: number;
}

describe('Factory and Repo', () => {
  let angularFireStoreService: AngularFirestore;
  let originalTimeout: number;
  let factory: FirestoreRepoFactory;
  let repo: FirestoreRepo<TestEntity>;

  const collectionPath = 'test-entities';

  beforeEach(() => {
    originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;
    TestBed.configureTestingModule({
      imports: [AngularFireModule.initializeApp(firebaseConfig), AngularFirestoreModule],
    });
    angularFireStoreService = TestBed.inject(AngularFirestore);
    factory = TestBed.inject(FirestoreRepoFactory);
    repo = new FirestoreRepo<TestEntity>(angularFireStoreService, collectionPath);
  });

  afterEach(() => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
  });

  describe('FirestoreRepoFactory', () => {
    it('should be created', () => {
      expect(factory).toBeTruthy();
    });

    it('should implement a method to create a new repository', () => {
      expect(typeof factory.create).toBe('function');
      expect(factory.create.length).toBe(1);
    });

    it('should return repo instance', () => {
      const actual = factory.create('some-collection');
      expect(actual instanceof FirestoreRepo).toBe(true);
    });
  });

  describe('FirestoreRepo', () => {
    it('should be created', () => {
      expect(repo).toBeTruthy();
    });

    it('should be able to add a document with generated id', async () => {
      const entity: TestEntity = {
        name: 'Test Add',
        timeStamp: 12345,
      };

      const actual = await repo.add(entity);

      expect(actual.id).toBeDefined();

      const docRef = angularFireStoreService.collection<TestEntity>(collectionPath).doc(actual.id)
        .ref;
      const exists = (await docRef.get()).exists;

      try {
        expect(exists).toBe(true);
      } finally {
        await docRef.delete();
      }
    });

    it('should be able to add a document with explicit id', async () => {
      const entity: TestEntity = {
        name: 'Test Add',
        timeStamp: 12345,
      };

      const explicitId = 'abc123';
      const actual = await repo.add(entity, explicitId);

      expect(actual.id).toBeDefined();
      expect(actual.id).toBe(explicitId);

      const docRef = angularFireStoreService.collection<TestEntity>(collectionPath).doc(explicitId)
        .ref;
      const exists = (await docRef.get()).exists;

      try {
        expect(exists).toBe(true);
      } finally {
        await docRef.delete();
      }
    });

    it('should be able to delete an existing document', async () => {
      const entity: TestEntity = {
        name: 'Test Delete',
        timeStamp: 12345,
      };

      const docRef = await angularFireStoreService
        .collection<TestEntity>(collectionPath)
        .add(entity);

      await repo.delete(docRef.id);

      const exists = (await docRef.get()).exists;
      expect(exists).toBe(false);
    });

    it('should be able to update an existing document', async () => {
      const entity: TestEntity = {
        name: 'Test Update',
        timeStamp: 12345,
      };

      const docRef = await angularFireStoreService
        .collection<TestEntity>(collectionPath)
        .add(entity);

      entity.id = docRef.id;
      entity.name = 'Test Update Changed';

      await repo.update(entity);

      try {
        const updated = (await docRef.get()).data();
        expect(updated.name).toEqual(entity.name);
      } finally {
        await docRef.delete();
      }
    });

    it('should be able to get value changes for a single document', async (done: DoneFn) => {
      const entity: TestEntity = {
        name: 'Test Single',
        timeStamp: 12345,
      };

      const docRef = await angularFireStoreService
        .collection<TestEntity>(collectionPath)
        .add(entity);

      const subscription = repo.get(docRef.id).subscribe(async (actual) => {
        try {
          expect(actual.id).toBe(docRef.id);
          expect(actual.name).toBe(entity.name);
        } finally {
          subscription.unsubscribe();
          await docRef.delete();
          done();
        }
      });
    });

    it('should be able to get snapshot changes for a single document', async (done: DoneFn) => {
      const entity: TestEntity = {
        name: 'Test Single',
        timeStamp: 12345,
      };

      const docRef = await angularFireStoreService
        .collection<TestEntity>(collectionPath)
        .add(entity);

      const subscription = repo.getSnapshot(docRef.id).subscribe(async (actual) => {
        try {
          expect(actual.payload.id).toBe(docRef.id);
          expect(actual.payload.data().name).toBe(entity.name);
          expect(actual.type).toBe('added');
        } finally {
          subscription.unsubscribe();
          await docRef.delete();
          done();
        }
      });
    });

    it('should be able to get value changes for a collection of documents', async (done: DoneFn) => {
      const entity1: TestEntity = {
        name: 'Test Multiple 1',
        timeStamp: 12345,
      };
      const entity2: TestEntity = {
        name: 'Test Multiple 2',
        timeStamp: 12345,
      };

      const collection = angularFireStoreService.collection<TestEntity>(collectionPath);
      const docRef1 = await collection.add(entity1);
      const docRef2 = await collection.add(entity2);

      const subscription = repo.fetch().subscribe(async (actual) => {
        try {
          expect(actual.length).toBe(2);
          expect(actual).toEqual(
            jasmine.arrayContaining([
              { id: docRef1.id, ...entity1 },
              { id: docRef2.id, ...entity2 },
            ])
          );
        } finally {
          subscription.unsubscribe();
          await docRef1.delete();
          await docRef2.delete();
          done();
        }
      });
    });

    it('should be able to get snapshot changes for a collection of documents', async (done: DoneFn) => {
      const entity1: TestEntity = {
        name: 'Test Multiple 1',
        timeStamp: 12345,
      };
      const entity2: TestEntity = {
        name: 'Test Multiple 2',
        timeStamp: 12345,
      };

      const collection = angularFireStoreService.collection<TestEntity>(collectionPath);
      const docRef1 = await collection.add(entity1);
      const docRef2 = await collection.add(entity2);

      const subscription = repo.fetchSnapshots().subscribe(async (actual) => {
        try {
          expect(actual.length).toBe(2);
          const payloads = actual.map((a) => a.payload.doc.data());
          expect(payloads).toEqual(jasmine.arrayContaining([entity1, entity2]));
        } finally {
          subscription.unsubscribe();
          await docRef1.delete();
          await docRef2.delete();
          done();
        }
      });
    });

    it('should be able to get filtered  value changes for a collection of documents', async (done: DoneFn) => {
      const entity1: TestEntity = {
        name: 'Test Multiple 1',
        timeStamp: 12345,
      };
      const entity2: TestEntity = {
        name: 'Test Multiple 2',
        timeStamp: 12345,
      };
      const entity3: TestEntity = {
        name: 'Filtered',
        timeStamp: 12345,
      };

      const collection = angularFireStoreService.collection<TestEntity>(collectionPath);
      const docRef1 = await collection.add(entity1);
      const docRef2 = await collection.add(entity2);
      const docRef3 = await collection.add(entity3);

      const filterSpecification: FilterSpecification = {
        fieldName: 'name',
        operator: '==',
        value: 'Filtered',
      };
      const subscription = repo
        .fetch({ filters: [filterSpecification] })
        .subscribe(async (actual) => {
          try {
            expect(actual.length).toBe(1);
            expect(actual).toEqual(jasmine.arrayContaining([{ id: docRef3.id, ...entity3 }]));
          } finally {
            subscription.unsubscribe();
            await docRef1.delete();
            await docRef2.delete();
            await docRef3.delete();
            done();
          }
        });
    });

    it('should be able to get sorted value changes for a collection of documents', async (done: DoneFn) => {
      const entity1: TestEntity = {
        name: 'Test Multiple 1',
        timeStamp: 12344,
      };
      const entity2: TestEntity = {
        name: 'Test Multiple 2',
        timeStamp: 12345,
      };

      const collection = angularFireStoreService.collection<TestEntity>(collectionPath);
      const docRef1 = await collection.add(entity1);
      const docRef2 = await collection.add(entity2);

      const sortSpecification: SortSpecification = {
        fieldName: 'name',
        direction: 'desc',
      };

      const subscription = repo.fetch({ sorts: [sortSpecification] }).subscribe(async (actual) => {
        try {
          expect(actual.length).toBe(2);
          expect(actual[0].name).toBe(entity2.name);
          expect(actual[1].name).toBe(entity1.name);
        } finally {
          subscription.unsubscribe();
          await docRef1.delete();
          await docRef2.delete();
          done();
        }
      });
    });

    xit('should be able to get filtered and sorted value changes for a collection of documents', async (done: DoneFn) => {
      const entity1: TestEntity = {
        name: 'Test Multiple A',
        timeStamp: 12345,
      };
      const entity2: TestEntity = {
        name: 'Test Multiple B',
        timeStamp: 12345,
      };
      const entity3: TestEntity = {
        name: 'Filtered',
        timeStamp: 654321,
      };

      const collection = angularFireStoreService.collection<TestEntity>(collectionPath);
      const docRef1 = await collection.add(entity1);
      const docRef2 = await collection.add(entity2);
      const docRef3 = await collection.add(entity3);

      const filterSpecification: FilterSpecification = {
        fieldName: 'timeStamp',
        operator: '==',
        value: 12345,
      };

      const sortSpecification: SortSpecification = {
        fieldName: 'name',
        direction: 'desc',
      };

      const subscription = repo
        .fetch({ filters: [filterSpecification], sorts: [sortSpecification] })
        .subscribe(async (actual) => {
          try {
            expect(actual.length).toBe(2);
            expect(actual).toEqual(
              jasmine.arrayContaining([
                { id: docRef1.id, ...entity1 },
                { id: docRef2.id, ...entity2 },
              ])
            );
            expect(actual[0].name).toBe(entity2.name);
            expect(actual[1].name).toBe(entity1.name);
          } finally {
            subscription.unsubscribe();
            await docRef1.delete();
            await docRef2.delete();
            await docRef3.delete();
            done();
          }
        });
    });

    it('should be able to get value changes for collection of documents limited to subset at start', async (done: DoneFn) => {
      const entity1: TestEntity = {
        name: 'Test Multiple A',
        timeStamp: 12345,
      };
      const entity2: TestEntity = {
        name: 'Test Multiple B',
        timeStamp: 12345,
      };
      const entity3: TestEntity = {
        name: 'Filtered',
        timeStamp: 654321,
      };

      const collection = angularFireStoreService.collection<TestEntity>(collectionPath);
      const docRef1 = await collection.add(entity1);
      const docRef2 = await collection.add(entity2);
      const docRef3 = await collection.add(entity3);

      const subscription = repo.fetch({ limit: 2 }).subscribe(async (actual) => {
        try {
          expect(actual.length).toBe(2);
        } finally {
          subscription.unsubscribe();
          await docRef1.delete();
          await docRef2.delete();
          await docRef3.delete();
          done();
        }
      });
    });

    it('should be able to get value changes for collection of documents starting at a specified field value', async (done: DoneFn) => {
      const entity1: TestEntity = {
        name: 'Test Start At 1',
        timeStamp: 12345,
      };
      const entity2: TestEntity = {
        name: 'Test Start At 2',
        timeStamp: 12346,
      };
      const entity3: TestEntity = {
        name: 'Test Start At 3',
        timeStamp: 12347,
      };
      const entity4: TestEntity = {
        name: 'Test Start At 4',
        timeStamp: 12348,
      };

      const collection = angularFireStoreService.collection<TestEntity>(collectionPath);
      const docRef1 = await collection.add(entity1);
      const docRef2 = await collection.add(entity2);
      const docRef3 = await collection.add(entity3);
      const docRef4 = await collection.add(entity4);

      const subscription = repo
        .fetch({
          sorts: [{ fieldName: 'timeStamp', direction: 'asc' }],
          startAt: 12346,
        })
        .subscribe(async (actual) => {
          try {
            expect(actual.length).toBe(3);
            expect(actual).toEqual(
              jasmine.arrayContaining([
                { id: docRef2.id, ...entity2 },
                { id: docRef3.id, ...entity3 },
                { id: docRef4.id, ...entity4 },
              ])
            );
          } finally {
            subscription.unsubscribe();
            await docRef1.delete();
            await docRef2.delete();
            await docRef3.delete();
            await docRef4.delete();
            done();
          }
        });
    });
  });

  it('should be able to get value changes for collection of documents starting after a specified field value', async (done: DoneFn) => {
    const entity1: TestEntity = {
      name: 'Test Start At 1',
      timeStamp: 12345,
    };
    const entity2: TestEntity = {
      name: 'Test Start At 2',
      timeStamp: 12346,
    };
    const entity3: TestEntity = {
      name: 'Test Start At 3',
      timeStamp: 12347,
    };
    const entity4: TestEntity = {
      name: 'Test Start At 4',
      timeStamp: 12348,
    };

    const collection = angularFireStoreService.collection<TestEntity>(collectionPath);
    const docRef1 = await collection.add(entity1);
    const docRef2 = await collection.add(entity2);
    const docRef3 = await collection.add(entity3);
    const docRef4 = await collection.add(entity4);

    const subscription = repo
      .fetch({
        sorts: [{ fieldName: 'timeStamp', direction: 'asc' }],
        startAfter: 12345,
      })
      .subscribe(async (actual) => {
        try {
          expect(actual.length).toBe(3);
          expect(actual).toEqual(
            jasmine.arrayContaining([
              { id: docRef2.id, ...entity2 },
              { id: docRef3.id, ...entity3 },
              { id: docRef4.id, ...entity4 },
            ])
          );
        } finally {
          subscription.unsubscribe();
          await docRef1.delete();
          await docRef2.delete();
          await docRef3.delete();
          await docRef4.delete();
          done();
        }
      });
  });

  it('should be able to get value changes for collection of documents ending at a specified field value', async (done: DoneFn) => {
    const entity1: TestEntity = {
      name: 'Test Start At 1',
      timeStamp: 12345,
    };
    const entity2: TestEntity = {
      name: 'Test Start At 2',
      timeStamp: 12346,
    };
    const entity3: TestEntity = {
      name: 'Test Start At 3',
      timeStamp: 12347,
    };
    const entity4: TestEntity = {
      name: 'Test Start At 4',
      timeStamp: 12348,
    };

    const collection = angularFireStoreService.collection<TestEntity>(collectionPath);
    const docRef1 = await collection.add(entity1);
    const docRef2 = await collection.add(entity2);
    const docRef3 = await collection.add(entity3);
    const docRef4 = await collection.add(entity4);

    const subscription = repo
      .fetch({
        sorts: [{ fieldName: 'timeStamp', direction: 'desc' }],
        endAt: 12346,
      })
      .subscribe(async (actual) => {
        try {
          expect(actual.length).toBe(3);
          expect(actual).toEqual(
            jasmine.arrayContaining([
              { id: docRef2.id, ...entity2 },
              { id: docRef3.id, ...entity3 },
              { id: docRef4.id, ...entity4 },
            ])
          );
        } finally {
          subscription.unsubscribe();
          await docRef1.delete();
          await docRef2.delete();
          await docRef3.delete();
          await docRef4.delete();
          done();
        }
      });
  });

  it('should be able to get value changes for collection of documents ending before a specified field value', async (done: DoneFn) => {
    const entity1: TestEntity = {
      name: 'Test Start At 1',
      timeStamp: 12345,
    };
    const entity2: TestEntity = {
      name: 'Test Start At 2',
      timeStamp: 12346,
    };
    const entity3: TestEntity = {
      name: 'Test Start At 3',
      timeStamp: 12347,
    };
    const entity4: TestEntity = {
      name: 'Test Start At 4',
      timeStamp: 12348,
    };

    const collection = angularFireStoreService.collection<TestEntity>(collectionPath);
    const docRef1 = await collection.add(entity1);
    const docRef2 = await collection.add(entity2);
    const docRef3 = await collection.add(entity3);
    const docRef4 = await collection.add(entity4);

    const subscription = repo
      .fetch({
        sorts: [{ fieldName: 'timeStamp', direction: 'desc' }],
        endBefore: 12345,
      })
      .subscribe(async (actual) => {
        try {
          expect(actual.length).toBe(3);
          expect(actual).toEqual(
            jasmine.arrayContaining([
              { id: docRef2.id, ...entity2 },
              { id: docRef3.id, ...entity3 },
              { id: docRef4.id, ...entity4 },
            ])
          );
        } finally {
          subscription.unsubscribe();
          await docRef1.delete();
          await docRef2.delete();
          await docRef3.delete();
          await docRef4.delete();
          done();
        }
      });
  });

  it('should correctly report existence of a document with a specified id', async () => {
    const entity: TestEntity = {
      name: 'Test Add',
      timeStamp: 12345,
    };
    const collection = angularFireStoreService.collection<TestEntity>(collectionPath);
    const docRef = await collection.add(entity);
    try {
      const exists = await repo.exists(docRef.id);
      expect(exists).toBe(true);
    } finally {
      await docRef.delete();
    }
  });

  it('should correctly report non existence of a document with a specified id', async () => {
    const exists = await repo.exists('1234567');
    expect(exists).toBe(false);
  });
});
