export declare class PaginationQueryDto {
    page?: number;
    pageSize?: number;
}
export declare function getSkipTake(input: {
    page?: number;
    pageSize?: number;
    defaultPage: number;
    defaultPageSize: number;
    maxPageSize: number;
}): {
    skip: number;
    take: number;
};
