export default class StringSimilarity {
    compareTwoStrings(first: any, second: any): number;
    findBestMatch(mainString: any, targetStrings: any): StringResult;
    areArgsValid(mainString: any, targetStrings: any): boolean;
}
interface StringResult {
    ratings: Array<{
        target: string;
        rating: number;
    }>;
    bestMatch: {
        target: string;
        rating: number;
    };
    bestMatchIndex: number;
}
export declare function compareTwoStrings(first: any, second: any): number;
export declare function findBestMatch(mainString: any, targetStrings: any): StringResult;
export {};
