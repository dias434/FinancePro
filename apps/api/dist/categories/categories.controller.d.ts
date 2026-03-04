import { CategoriesService } from "./categories.service";
import { CategoryListQueryDto } from "./dto/category-list.query";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";
export declare class CategoriesController {
    private readonly categories;
    constructor(categories: CategoriesService);
    list(req: any, query: CategoryListQueryDto): Promise<{
        page: number;
        pageSize: number;
        total: number;
        items: {
            id: string;
            name: string;
            type: import("@prisma/client").$Enums.CategoryType;
            icon: string | undefined;
            color: string | undefined;
            createdAt: string;
            updatedAt: string;
        }[];
    }>;
    create(req: any, dto: CreateCategoryDto): Promise<{
        id: string;
        name: string;
        type: import("@prisma/client").$Enums.CategoryType;
        icon: string | undefined;
        color: string | undefined;
        createdAt: string;
        updatedAt: string;
    }>;
    update(req: any, id: string, dto: UpdateCategoryDto): Promise<{
        id: string;
        name: string;
        type: import("@prisma/client").$Enums.CategoryType;
        icon: string | undefined;
        color: string | undefined;
        createdAt: string;
        updatedAt: string;
    }>;
    remove(req: any, id: string): Promise<{
        ok: boolean;
    }>;
}
