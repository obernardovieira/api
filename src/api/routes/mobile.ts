import { celebrate, Joi } from 'celebrate';
import { Router } from 'express';

import config from '../../config';
import { models } from '../../database';

const route = Router();

export default (app: Router): void => {
    app.use('/mobile', route);

    route.get('/version', (req, res) => {
        res.send({
            latest: config.mobileVersion.latest,
            minimal: config.mobileVersion.minimal,
            timestamp: new Date().getTime(),
        });
    });

    route.post(
        '/error',
        celebrate({
            body: Joi.object({
                version: Joi.string().optional(), // if not logged-in
                address: Joi.string().allow(''), // if not logged-in
                action: Joi.string().required(),
                error: Joi.string().required(),
            }),
        }),
        (req, res) => {
            const { version, address, action, error } = req.body;
            models.mobileError.create({
                version,
                address,
                action,
                error,
            });
            res.sendStatus(200);
        }
    );
};
