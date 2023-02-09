import Provider from "../Provider";
import { Result } from "../Core";
export default class Animek extends Provider {
    private anidb;
    constructor();
    search(query: string): Promise<Array<Result>>;
    getSchedule(start?: number, max?: number): Promise<ScheduleResult[]>;
}
interface ScheduleResult {
    idMal: string;
    day: string;
    datetime: string;
}
export {};
