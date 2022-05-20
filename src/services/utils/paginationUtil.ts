import { Page } from "@npmjs_tdsoftware/subidentity";

export const paginationUtil = {
    async paginate(items: any[], pageNum: number, limit: number, totalItemsCount: number): Promise<Page<any>> {
        let totalPageCount, previous, next;
        if(totalItemsCount > 0) {
            const startIndex = (pageNum -1) * limit;
            const endIndex = pageNum * limit;
            totalPageCount = Math.ceil(totalItemsCount/limit);
            if(startIndex > 0)
                previous = pageNum - 1;
            if(endIndex < totalItemsCount)
                next = pageNum + 1;
        }
        return {totalItemsCount, totalPageCount, previous, next, items}; 
    }
};
