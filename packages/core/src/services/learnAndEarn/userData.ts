import { literal, Op } from 'sequelize';

import { models } from '../../database';
import { BaseError } from '../../utils/baseError';

export async function total(userId: number): Promise<{
    lesson: {
        completed: number;
        total: number;
    };
    level: {
        completed: number;
        total: number;
    };
    claimRewards: {
        levelId: number;
        amount: number;
        signature: string;
    }[];
}> {
    try {
        // get levels
        const user = await models.appUser.findOne({
            attributes: ['language'],
            where: { id: userId },
        });
        const levels = (await models.learnAndEarnLevel.findAll({
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
                languages: { [Op.contains]: [user!.language] },
            },
            raw: true,
        })) as unknown as {
            completed: number;
            total: number;
        }[];

        // get lessons
        const lessons = (await models.learnAndEarnLesson.findAll({
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
                languages: { [Op.contains]: [user!.language] },
            },
            raw: true,
        })) as unknown as {
            completed: number;
            total: number;
        }[];

        // get earned
        const claimRewards = await models.learnAndEarnPayment.findAll({
            attributes: ['levelId', 'amount', 'signature'],
            where: {
                userId,
                status: 'pending',
            },
        });

        const level = levels[0];
        const lesson = lessons[0];

        return {
            lesson,
            level,
            claimRewards: {
                ...claimRewards.map(({ levelId, amount, signature }) => ({
                    levelId,
                    amount,
                    signature,
                })),
            },
        };
    } catch (error) {
        throw new BaseError('GET_TOTAL_FAILED', 'get total failed');
    }
}