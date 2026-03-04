import { GoalsService } from "./goals.service";
import { CreateGoalDto } from "./dto/create-goal.dto";
import { GoalListQueryDto } from "./dto/goal-list.query";
import { UpdateGoalDto } from "./dto/update-goal.dto";
export declare class GoalsController {
    private readonly goals;
    constructor(goals: GoalsService);
    list(req: any, query: GoalListQueryDto): Promise<{
        page: number;
        pageSize: number;
        total: number;
        items: {
            id: string;
            name: string;
            targetCents: number;
            currentCents: number;
            targetDate: string;
            progressPercent: number;
            remainingCents: number;
            completed: boolean;
            daysRemaining: number;
            createdAt: string;
            updatedAt: string;
        }[];
    }>;
    create(req: any, dto: CreateGoalDto): Promise<{
        id: string;
        name: string;
        targetCents: number;
        currentCents: number;
        targetDate: string;
        progressPercent: number;
        remainingCents: number;
        completed: boolean;
        daysRemaining: number;
        createdAt: string;
        updatedAt: string;
    }>;
    update(req: any, id: string, dto: UpdateGoalDto): Promise<{
        id: string;
        name: string;
        targetCents: number;
        currentCents: number;
        targetDate: string;
        progressPercent: number;
        remainingCents: number;
        completed: boolean;
        daysRemaining: number;
        createdAt: string;
        updatedAt: string;
    }>;
    remove(req: any, id: string): Promise<{
        ok: boolean;
    }>;
}
