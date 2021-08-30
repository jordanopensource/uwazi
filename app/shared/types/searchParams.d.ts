/* eslint-disable */
/**AUTO-GENERATED. RUN yarn emit-types to update.*/

export interface SearchParams {
  query?: {
    aggregateGeneratedToc?: boolean;
    aggregatePermissionsByLevel?: boolean;
    aggregatePermissionsByUsers?: boolean;
    aggregatePublishingStatus?: boolean;
    filters?: {
      [k: string]: unknown | undefined;
    };
    customFilters?: {
      generatedToc?: {
        values?: [] | [boolean];
      };
      'permissions.level'?: {
        values?: [] | [string];
      };
      'permissions.read'?: {
        values?: [] | [string];
        and?: boolean;
      };
      'permissions.write'?: {
        values?: [] | [string];
      };
    };
    types?: [] | [string];
    _types?: [] | [string];
    fields?: [] | [string];
    include?: [] | [string];
    allAggregations?: boolean;
    aggregations?: string;
    order?: 'asc' | 'desc';
    sort?: string;
    limit?: number;
    from?: number;
    searchTerm?: string | number;
    includeUnpublished?: boolean;
    userSelectedSorting?: boolean;
    treatAs?: string;
    unpublished?: boolean;
    select?: [] | [string];
    geolocation?: boolean;
  };
  [k: string]: unknown | undefined;
}
