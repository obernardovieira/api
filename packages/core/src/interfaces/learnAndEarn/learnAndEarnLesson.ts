/**
 * @swagger
 *  components:
 *    schemas:
 *      LearnAndEarnLesson:
 *        type: object
 *        required:
 *          - id
 *          - prismicId
 *          - levelId
 *          - active
 *        properties:
 *          id:
 *            type: integer
 *          prismicId:
 *            type: string
 *          levelId:
 *            type: number
 *          active:
 *            type: boolean
 */
export interface LearnAndEarnLesson {
    id: number;
    prismicId: string;
    levelId: number;
    active: boolean;
}

export interface LearnAndEarnLessonCreation {
    prismicId: string;
    levelId: number;
    active: boolean;
}