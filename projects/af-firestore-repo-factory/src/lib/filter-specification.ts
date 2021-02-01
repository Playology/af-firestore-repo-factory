export interface FilterSpecification {
  fieldName: string;
  operator: '<' | '<=' | '==' | '>' | '>=' | '!=' | 'array-contains' | 'array-contains-any' | 'in' | 'not-in';
  value: any;
}
