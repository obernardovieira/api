import { literal, Op } from 'sequelize';

import { models } from '../../database';
import { BaseError } from '../../utils/baseError';

export default class LearnAndEarnService {
    public async total(userId: number) {
        try {
            // get levels
            const levels = await models.learnAndEarnLevel.findAll({
                attributes: [
                    [
                        literal(
                            `count(*) FILTER (WHERE "userLevel".status = 'completed')`
                        ),
                        'completed',
                    ],
                    [literal(`count(*)`), 'total'],
                ],
                include: [
                    {
                        attributes: [],
                        model: models.learnAndEarnUserLevel,
                        as: 'userLevel',
                        where: {
                            userId,
                        },
                        required: false,
                    },
                ],
                where: {
                    active: true,
                },
                raw: true,
            });

            // get lessons
            const lessons = await models.learnAndEarnLesson.findAll({
                attributes: [
                    [
                        literal(
                            `count(*) FILTER (WHERE "userLesson".status = 'completed')`
                        ),
                        'completed',
                    ],
                    [literal(`count(*)`), 'total'],
                ],
                include: [
                    {
                        attributes: [],
                        model: models.learnAndEarnUserLesson,
                        as: 'userLesson',
                        where: {
                            userId,
                        },
                        required: false,
                    },
                ],
                where: {
                    active: true,
                },
                raw: true,
            });

            // get earned
            const payments = await models.learnAndEarnPayment.findOne({
                attributes: [[literal(`sum(amount)`), 'amount']],
                where: {
                    userId,
                },
                raw: true,
            });

            return {
                lessons: lessons[0],
                levels: levels[0],
                received: payments?.amount || 0,
            };
        } catch (error) {
            throw new BaseError('GET_TOTAL_FAILED', 'get total failed');
        }
    }

    public async answer(userId: number, answers: string[], lesson: number) {
        try {
            const quizzes = await models.learnAndEarnQuiz.findAll({
                where: {
                    lessonId: lesson,
                },
            });

            if (!quizzes || !quizzes.length) {
                throw new BaseError('QUIZ_NOT_FOUND', 'quiz not found');
            }

            const wrongAnswers = answers.reduce((acc, el, index) => {
                const quiz = quizzes[index];
                if (quiz?.answerId !== el) {
                    acc.push(index);
                }
                return acc;
            }, [] as number[]);

            if (wrongAnswers && wrongAnswers.length > 0) {
                // set attempts
                const userLesson = await models.learnAndEarnUserLesson.update(
                    {
                        attempts: literal('attempts + 1'),
                    },
                    {
                        where: {
                            userId,
                            lessonId: quizzes[0].lessonId,
                            status: 'started',
                        },
                        returning: true,
                    }
                );

                // return wrong answers
                return {
                    success: false,
                    wrongAnswers,
                    attempts: userLesson[1][0].attempts,
                };
            } else {
                // completed lesson, calculate points
                const userLesson = await models.learnAndEarnUserLesson.findOne({
                    where: {
                        lessonId: quizzes[0].lessonId,
                        status: 'started',
                    },
                });

                if (!userLesson) {
                    throw new BaseError(
                        'LESSON_ALREADY_COMPLETED',
                        'lesson already completed'
                    );
                }

                const attempts = userLesson?.attempts! + 1;
                let points = 0;
                switch (attempts) {
                    case 1:
                        points = 10;
                        break;
                    case 2:
                        points = 8;
                        break;
                    case 3:
                        points = 5;
                        break;
                    default:
                        points = 0;
                        break;
                }

                await models.learnAndEarnUserLesson.update(
                    {
                        attempts,
                        points,
                        status: 'completed',
                        completionDate: new Date(),
                    },
                    {
                        where: {
                            userId,
                            lessonId: quizzes[0].lessonId,
                        },
                    }
                );

                const lesson = await models.learnAndEarnLesson.findOne({
                    where: { id: quizzes[0].lessonId },
                });
                const totalPoints = await this.getTotalPoints(
                    userId,
                    lesson!.levelId
                );
                // verify if all the lessons was completed
                const pendingLessons = await this.countPendingLessons(
                    lesson!.levelId,
                    userId
                );

                if (pendingLessons === 0) {
                    // if so, complete the level and make the payment
                    await models.learnAndEarnUserLevel.update(
                        {
                            status: 'completed',
                            completionDate: new Date(),
                        },
                        {
                            where: {
                                userId,
                                levelId: lesson!.levelId,
                            },
                        }
                    );

                    // TODO: payment

                    // verify if the category was completed
                    const level = await models.learnAndEarnLevel.findOne({
                        where: { id: lesson!.levelId },
                    });
                    const pendingLevels = await this.countPendingLevels(
                        level!.categoryId,
                        userId
                    );

                    if (pendingLevels === 0) {
                        // if so, complete category
                        await models.learnAndEarnUserCategory.update(
                            {
                                status: 'completed',
                                completionDate: new Date(),
                            },
                            {
                                where: {
                                    userId,
                                    categoryId: level!.categoryId,
                                },
                            }
                        );
                        const category =
                            await models.learnAndEarnCategory.findOne({
                                attributes: ['prismicId'],
                                where: {
                                    id: level!.categoryId,
                                },
                            });

                        return {
                            success: true,
                            attempts,
                            points,
                            totalPoints,
                            pendingLessons,
                            levelCompleted: level!.prismicId,
                            categoryCompleted: category!.prismicId,
                        };
                    } else {
                        return {
                            success: true,
                            attempts,
                            points,
                            totalPoints,
                            pendingLessons,
                            levelCompleted: level!.prismicId,
                        };
                    }
                } else {
                    return {
                        success: true,
                        attempts,
                        points,
                        totalPoints,
                        pendingLessons,
                    };
                }
            }
        } catch (error) {
            throw new BaseError(
                error.name || 'VERIFY_ANSWER_FAILED',
                error.message || 'failed to verify answers'
            );
        }
    }

    public async startLesson(userId: number, lessonId: number) {
        try {
            const status = 'started';
            const lesson = await models.learnAndEarnLesson.findOne({
                attributes: ['levelId'],
                where: {
                    id: lessonId,
                },
            });
            const level = await models.learnAndEarnLevel.findOne({
                attributes: ['id', 'categoryId'],
                where: {
                    id: lesson!.levelId,
                },
            });

            // create userLesson
            const userLesson = await models.learnAndEarnUserLesson.findOrCreate(
                {
                    where: {
                        lessonId,
                        userId,
                    },
                    defaults: {
                        lessonId,
                        userId,
                        points: 0,
                        attempts: 0,
                        status,
                    },
                }
            );

            const userLevel = await models.learnAndEarnUserLevel.findOrCreate({
                where: {
                    levelId: lesson!.levelId,
                    userId,
                },
                defaults: {
                    levelId: lesson!.levelId,
                    userId,
                    status,
                },
            });

            const userCategory =
                await models.learnAndEarnUserCategory.findOrCreate({
                    where: {
                        categoryId: level!.categoryId,
                        userId,
                    },
                    defaults: {
                        categoryId: level!.categoryId,
                        userId,
                        status,
                    },
                });

            return {
                lesson: userLesson[0],
                level: userLevel[0],
                category: userCategory[0],
            };
        } catch (error) {
            throw new BaseError(
                error.name || 'START_LESSON_FAILED',
                error.message || 'failed to start a lesson'
            );
        }
    }

    public async listLevels(
        userId: number,
        status: string,
        offset: number,
        limit: number,
        category?: string,
        level?: string
    ) {
        try {
            const where: any = {
                [Op.and]: [
                    literal(
                        status === 'completed'
                            ? `"userLevel".status = '${status}'`
                            : `"userLevel".status = 'started' or "userLevel".status is null`
                    ),
                    level ? { prismicId: level } : {},
                    { active: true },
                ],
            };
            const userLevels = await models.learnAndEarnLevel.findAll({
                attributes: [
                    'id',
                    ['prismicId', 'level'],
                    'totalReward',
                    [literal('"userLevel".status'), 'status'],
                    [literal(`count(lesson.id)`), 'totalLessons'],
                ],
                include: [
                    {
                        attributes: [],
                        model: models.learnAndEarnUserLevel,
                        as: 'userLevel',
                        required: false,
                        where: {
                            userId,
                        },
                        duplicating: false,
                    },
                    {
                        attributes: [],
                        model: models.learnAndEarnLesson,
                        as: 'lesson',
                        duplicating: false,
                    },
                    {
                        attributes: ['prismicId'],
                        model: models.learnAndEarnCategory,
                        as: 'category',
                        duplicating: false,
                        ...(category
                            ? {
                                  where: {
                                      prismicId: category,
                                  },
                              }
                            : {}),
                    },
                ],
                where,
                group: [
                    '"LearnAndEarnLevelModel".id',
                    '"LearnAndEarnLevelModel".prismicId',
                    '"LearnAndEarnLevelModel"."totalReward"',
                    'category."prismicId',
                    '"userLevel".status',
                ],
                limit,
                offset,
                raw: true,
            });

            userLevels.forEach((el: any) => {
                el.status = el.status || 'available';
                el.category = el['category.prismicId'];
                delete el['category.prismicId'];
            });

            const count = await models.learnAndEarnLevel.count({
                attributes: [],
                include: [
                    {
                        attributes: [],
                        model: models.learnAndEarnUserLevel,
                        as: 'userLevel',
                        required: false,
                        where: {
                            userId,
                        },
                    },
                    {
                        attributes: [],
                        model: models.learnAndEarnCategory,
                        as: 'category',
                        ...(category
                            ? {
                                  where: {
                                      prismicId: category,
                                  },
                              }
                            : {}),
                    },
                ],
                where,
            });

            return {
                count,
                rows: userLevels,
            };
        } catch (error) {
            throw new BaseError('LIST_LEVELS_FAILED', 'list levels failed');
        }
    }

    public async listLessons(userId: number, levelId: number) {
        try {
            const lessons = await models.learnAndEarnLesson.findAll({
                include: [
                    {
                        attributes: ['status'],
                        model: models.learnAndEarnUserLesson,
                        as: 'userLesson',
                        required: false,
                        where: {
                            userId,
                        },
                    },
                ],
                where: {
                    levelId,
                    active: true,
                },
            });

            return lessons.map((lesson: any) => ({
                id: lesson.id,
                prismicId: lesson.prismicId,
                levelId: lesson.levelId,
                status: lesson.userLesson[0]?.status || 'available',
            }));
        } catch (error) {
            throw new BaseError('LIST_LESSONS_FAILED', 'list lessons failed');
        }
    }

    private async countPendingLessons(
        levelId: number,
        userId: number
    ): Promise<number> {
        const pendingLessons = (await models.learnAndEarnLesson.findAll({
            attributes: [
                [
                    literal(
                        `count(*) FILTER (WHERE "userLesson".status = 'pending' or "userLesson".status is null)`
                    ),
                    'pending',
                ],
            ],
            include: [
                {
                    attributes: [],
                    model: models.learnAndEarnUserLesson,
                    as: 'userLesson',
                    where: {
                        userId,
                    },
                    required: false,
                },
            ],
            where: {
                levelId,
                active: true,
            },
            raw: true,
        })) as any;

        return parseInt(pendingLessons[0].pending);
    }

    private async countPendingLevels(
        categoryId: number,
        userId: number
    ): Promise<number> {
        const pendingLevels = (await models.learnAndEarnLevel.findAll({
            attributes: [
                [
                    literal(
                        `count(*) FILTER (WHERE "userLevel".status = 'pending' or "userLevel".status is null)`
                    ),
                    'pending',
                ],
            ],
            include: [
                {
                    attributes: [],
                    model: models.learnAndEarnUserLevel,
                    as: 'userLevel',
                    where: {
                        userId,
                    },
                    required: false,
                },
            ],
            where: {
                active: true,
                categoryId,
            },
            raw: true,
        })) as any;

        return parseInt(pendingLevels[0].pending);
    }

    private async getTotalPoints(
        userId: number,
        levelId: number
    ): Promise<number> {
        const totalPoints = (await models.learnAndEarnUserLesson.findAll({
            attributes: [[literal(`sum(points)`), 'total']],
            include: [
                {
                    attributes: [],
                    model: models.learnAndEarnLesson,
                    as: 'lesson',
                    where: {
                        levelId,
                    },
                },
            ],
            where: {
                userId,
            },
            raw: true,
        })) as any;

        return parseInt(totalPoints[0].total);
    }
}
