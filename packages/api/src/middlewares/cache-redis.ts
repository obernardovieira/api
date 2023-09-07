import { NextFunction } from 'express';
import { RequestWithUser } from './core';
import { database } from '@impactmarket/core';

const { redisClient: redis } = database;

/**
 * Cache middleware
 * @param duration Duration is seconds
 * @returns void
 */
export const cache =
    (duration: number, useUserCache: boolean = false) =>
    // "res" needs to not have any type, otherwise, typescript will fail
    async (req: RequestWithUser, res: any, next: NextFunction) => {
        // adding 'user' to user key to avoid cache collision netween user ids and level ids
        const key =
            '__express__' + (req.originalUrl || req.url) + (useUserCache && req.user && `user${req.user!.userId}`);
        const cachedBody = await redis.get(key);
        if (cachedBody) {
            res.send(cachedBody);
        } else {
            res.sendResponse = res.send;
            res.send = (body: any) => {
                // Only cache if the response is 200
                if (res.statusCode === 200) {
                    redis.set(key, body, 'EX', duration);
                }
                res.sendResponse(body);
            };
            next();
        }
    };
