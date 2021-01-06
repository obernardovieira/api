import { Router } from 'express';
import communityController from '@controllers/community';
import communityValidators from '@validators/community';
import { authenticateToken } from '../middlewares';

const route = Router();

export default (app: Router): void => {
    app.use('/community', route);

    // deprecated
    route.get(
        '/address/:contractAddress',
        communityController.findByContractAddress
    );
    // deprecated
    route.get(
        '/id/:publicId',
        communityController.findByPublicId
    );

    route.get(
        '/publicid/:publicId',
        communityController.getByPublicId
    );
    route.get(
        '/contract/:address',
        communityController.getByContractAddress
    );
    route.get(
        '/hssi/:publicId',
        communityController.getHistoricalSSI
    );
    route.get(
        '/all/:status',
        communityController.getAll
    );
    /**
     * @swagger
     *
     * /managers:
     *   get:
     *     tags:
     *       - "community"
     *     produces:
     *       - application/json
     */
    route.get(
        '/managers',
        authenticateToken,
        communityController.managers
    );
    /**
     * @swagger
     *
     * /managers/details:
     *   get:
     *     security:
     *      - api_auth:
     *        - "write"
     *        - "read"
     *     tags:
     *       - "community"
     *     produces:
     *       - application/json
     */
    route.get(
        '/managers/details',
        authenticateToken,
        communityController.managersDetails
    );
    /**
     * @swagger
     *
     * /list/light/{order}:
     *   get:
     *     tags:
     *       - "community"
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: order
     *         in: path
     *         type: string
     */
    route.get('/list/light/:order?', communityController.list);
    /**
     * @deprecated Deprecated in mobile version 0.1.4
     */
    route.get('/list', communityController.list);
    route.get('/list/full/:order?', communityController.listFull);
    route.post(
        '/create',
        authenticateToken,
        communityValidators.create,
        communityController.create
    );
    route.post(
        '/edit',
        authenticateToken,
        communityValidators.edit,
        communityController.edit
    );
    // TODO: add verification (not urgent, as it highly depends on the contract transaction)
    route.post(
        '/accept',
        communityValidators.accept,
        communityController.accept
    );
    route.get(
        '/pending',
        communityController.pending
    );
};
