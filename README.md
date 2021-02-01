## Angularfire Firestore Repository Factory

This Angular library includes a module that provides a factory service for creating generic repositories to access Firestore data using AngularFire.

Often when using AngularFire you create a lot of code that is very similar. Even if you take the trouble to create a generic repository base class and derive from it to create strongly typed data access services you write a lot of code that is almost the same. Not fun and time consuming so to save time and reduce repetetive coding here is a factory that you inject and have it create a generic repository typed for the documents you want to access.

### Pre-requisites

First this library depends on AngularFire and therefore on Firebase as peer dependencies, so if you haven't already set your project up for AngularFire you will need to follow the steps at over at https://github.com/angular/angularfire/blob/master/docs/install-and-setup.md before installing this package.

### Installation

To install this package execute the following in a terminal window focused on your project

```bash
npm install @ngxtend/af-firesetore-repo-factory
```

Now somewhere, usually in app.module.ts you need to import FirestoreRepoFactoryModule something like this

```ts
import { BrowserModule } from "@angular/platform-browser";
import { NgModule } from "@angular/core";
import { AppComponent } from "./app.component";
import { AngularFireModule } from "@angular/fire";
import { AngularFirestoreModule } from "@angular/fire/firestore";
import { firestoreRepoFactoryModule } from "@testposssessed/angularfire-repo-factory"; // import the module
import { environment } from "../environments/environment";

@NgModule({
  imports: [
    BrowserModule,
    AngularFireModule.initializeApp(environment.firebase, "my-app-name"),
    AngularFirestoreModule,
    FirestoreRepoFactoryModule, // provides the FirestoreRepoFactory service
  ],
  declarations: [AppComponent],
  bootstrap: [AppComponent],
})
export class AppModule {}
```

### Usage

Once you have the module imported into your application you can inject the service into any component or service and use it to create a repository

```ts
...
import { FirestoreRepoFactoryModule } from '@ngxtend/af-firesetore-repo-factory';

...

@Component({...})
export class MyComponent {

  constructor(private firestoreRepoFactory: FirestoreRepoFactory) {}

  doStuff() {

    // get a repository for a ToDo type stored in a todos collection
    const repo = this.firestoreRepoFactory.create<ToDo>('todos');

    // add a new todo
    const toDo: ToDo = {
      title: 'title',
      description: 'description',
      done: false
    }

    // using asnc/await
    toDo = await repo.add(toDo);
    // do something with result that now has an id

    // or
    // using promise
    repo.add(toDo).then(d => {
      // do something with the result that now has an id
    });

    // update the todo
    toDo.done = true;

    // using async/await
    toDo = await repo.update(toDo);
    // do something with updated item

    // or
    // using promise
    repo.update(toDo).then(d => {
      // do something with the updated item
    });

    // delete the todo
    await repo.delete(toDo); // fire and forget

    // get value changes for a single doc by identifier
    const subscription = repo.get('1').subscribe({
      next: d => {
        // do something with the returned document
      }
    });

    // get snapshot changes for a single doc by identifier
    const subscription = repo.getSnapshot('1').subscribe({
      next: d => {
        // do something with the returned document
      }
    });

    // get value changes for all documents in the collection
    const subscription = repo.fetch().subscribe({
      next: d => {
        // do something with the array of documents
      }
    });

    // get snapshot changes for all events on all documents in the collection
    const subscription = repo.fetchSnapshots().subscribe({
      next: d => {
        // do something with the array of documents
      }
    });
  }
}
```

### Querying

Both variants of the _fetch_ method accept an options object as the first argument, this object allows you to sort, filter and limit the results returned. The _FilterOptions_ object looks like this

```ts
export interface FetchOptions {
  endAt?: any;
  endBefore?: any;
  filters?: FilterSpecification[];
  limit?: number;
  sorts?: SortSpecification[];
  startAfter?: any;
  startAt?: any;
}
```

Based on this object _FirestoreRepo_ will build and submit a query against the collection. For examples of querying take a look at the tests.

_IMPORTANT_ No validation is done against the options object, it is your responsibility to understand firestore querying capabilities and limitations, and submit valid options.

### Entities

Within the repo we map the document identifier (whether generated automatically or explicitly) to a field named _id_. To be sure TypeScript doesn't complain about this we have a generic constraint on the _T_ you pass to the factory when creating a repo. The constraint requires that your entities implemnt the FirestoreEntity interface that defines an optional _id_ property. It is optional so you can leave it off when creating new entities, but will be populated during creation or retrieval. So your types need to look something like this or simply have an optional _id_ property:

```ts
export interface IToDo extends FirestoreEntity {
  title: string;
  desription?: string;
  done?: boolean;
}
```

Simple as that. Constructive critcism and suggestions are encouraged, please post an issue with your suggestion or comment and it will be dealt with as soon as time allows.

Contributions will be considered via pull request too.

I created this primarly for my own use to improve the testability of my code, but if you find it useful enjoy. It is much easier to create spies or fakes of the factory or repo types that AngularFire itself and since this library is tested I trust it works.
