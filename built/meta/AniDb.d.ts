import Provider from "../Provider";
import { Type } from "./AniList";
/**
 * @description AniDb provider meant for converting Animek IDs to MyAnimeList IDs
 */
export default class AniDb extends Provider {
    constructor();
    idToMal(id: string, type: Type): Promise<string>;
    /**
     * @decprecated Use idToMal instead. This method is not working anymore.
     * @description Converts AniDb IDs to MyAnimeList IDs
     * @param id AniDb ID
     * @param type Type of media
     * @returns Promise<string>
     */
    idToMalOLD(id: string, type: Type): Promise<string>;
}
