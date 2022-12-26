import { ethers } from 'ethers';
import { literal } from 'sequelize';

import config from '../../config';
import { models } from '../../database';
import { BaseError } from '../../utils/baseError';

async function countAvailableLessons(
    levelId: number,
    userId: number
): Promise<number> {
    const availableLessons = (await models.learnAndEarnLesson.findAll({
        attributes: [
            [
                literal(
                    `count(*) FILTER (WHERE "userLesson".status = 'available' or "userLesson".status is null)`
                ),
                'available',
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

    return parseInt(availableLessons[0].available, 10);
}

async function countAvailableLevels(
    categoryId: number,
    userId: number
): Promise<number> {
    const availableLevels = (await models.learnAndEarnLevel.findAll({
        attributes: [
            [
                literal(
                    `count(*) FILTER (WHERE "userLevel".status = 'available' or "userLevel".status is null)`
                ),
                'available',
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

    return parseInt(availableLevels[0].available, 10);
}

async function getTotalPoints(
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

    return parseInt(totalPoints[0].total, 10);
}

async function signParams(
    beneficiaryAddress: string,
    levelId: number,
    amountEarned: number
): Promise<string> {
    const signer = new ethers.Wallet(config.learnAndEarnPrivateKey);

    const message = ethers.utils.solidityKeccak256(
        ['address', 'uint256', 'uint256'],
        [beneficiaryAddress, levelId, amountEarned]
    );
    const arrayifyMessage = ethers.utils.arrayify(message);
    return await signer.signMessage(arrayifyMessage);
}

async function calculateReward(
    userId: number,
    levelId: number
): Promise<number> {
    const level = await models.learnAndEarnLevel.findOne({
        attributes: ['totalReward'],
        where: {
            id: levelId,
        },
    });
    const points = await getTotalPoints(userId, levelId);
    let percentage = 0;

    if (points < 10) {
        percentage = 15;
    } else if (points >= 10 && points < 20) {
        percentage = 35;
    } else if (points >= 20 && points < 30) {
        percentage = 55;
    } else if (points >= 30 && points < 40) {
        percentage = 75;
    } else if (points >= 40 && points < 50) {
        percentage = 85;
    } else if (points >= 50) {
        percentage = 100;
    }

    return (percentage / 100) * level!.totalReward;
}

export async function answer(
    user: { userId: number; address: string },
    answers: number[],
    lesson: number
) {
    try {
        const quizzes = await models.learnAndEarnQuiz.findAll({
            where: {
                lessonId: lesson,
            },
            order: ['order'],
        });

        if (!quizzes || !quizzes.length) {
            throw new BaseError('QUIZ_NOT_FOUND', 'quiz not found');
        }

        const wrongAnswers = answers.reduce((acc, el, index) => {
            const quiz = quizzes.find((quiz) => quiz.order === index);
            if (quiz?.answer !== el) {
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
                        userId: user.userId,
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
                        userId: user.userId,
                        lessonId: quizzes[0].lessonId,
                    },
                }
            );

            const lesson = await models.learnAndEarnLesson.findOne({
                where: { id: quizzes[0].lessonId },
            });
            const totalPoints = await getTotalPoints(
                user.userId,
                lesson!.levelId
            );
            // verify if all the lessons was completed
            const availableLessons = await countAvailableLessons(
                lesson!.levelId,
                user.userId
            );

            if (availableLessons === 0) {
                // if so, complete the level and make the payment
                await models.learnAndEarnUserLevel.update(
                    {
                        status: 'completed',
                        completionDate: new Date(),
                    },
                    {
                        where: {
                            userId: user.userId,
                            levelId: lesson!.levelId,
                        },
                    }
                );

                // create signature
                const level = await models.learnAndEarnLevel.findOne({
                    where: { id: lesson!.levelId },
                });
                const signature = await signParams(
                    user.address,
                    level!.id,
                    level!.totalReward
                );
                const amount = await calculateReward(user.userId, level!.id);
                await models.learnAndEarnPayment.create({
                    userId: user.userId,
                    levelId: level!.id,
                    amount,
                    status: 'pending',
                    signature,
                });

                // verify if the category was completed
                const availableLevels = await countAvailableLevels(
                    level!.categoryId,
                    user.userId
                );

                if (availableLevels === 0) {
                    // if so, complete category
                    await models.learnAndEarnUserCategory.update(
                        {
                            status: 'completed',
                            completionDate: new Date(),
                        },
                        {
                            where: {
                                userId: user.userId,
                                categoryId: level!.categoryId,
                            },
                        }
                    );
                    const category = await models.learnAndEarnCategory.findOne({
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
                        availableLessons,
                        levelCompleted: level!.prismicId,
                        categoryCompleted: category!.prismicId,
                    };
                } else {
                    return {
                        success: true,
                        attempts,
                        points,
                        totalPoints,
                        availableLessons,
                        levelCompleted: level!.prismicId,
                    };
                }
            } else {
                return {
                    success: true,
                    attempts,
                    points,
                    totalPoints,
                    availableLessons,
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