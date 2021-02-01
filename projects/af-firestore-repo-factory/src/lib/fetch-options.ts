import { FilterSpecification } from './filter-specification';
import { SortSpecification } from './sort-specification';

/**
 * Query options supported for fetch* methods
 */
export interface FetchOptions {
  endAt?: any;
  endBefore?: any;
  filters?: FilterSpecification[];
  limit?: number;
  sorts?: SortSpecification[];
  startAfter?: any;
  startAt?: any;
}
