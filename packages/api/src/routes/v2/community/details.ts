import { Router } from 'express';

import { CommunityController } from '../../../controllers/v2/community/details';

export default (route: Router): void => {
    const controller = new CommunityController();

    /**
     * @swagger
     *
     * /community/{id}/state:
     *   get:
     *     tags:
     *       - "community"
     *     summary: Get community state
     *     parameters:
     *       - in: path
     *         name: id
     *         schema:
     *           type: integer
     *         required: true
     *         description: community id
     *     responses:
     *       "200":
     *         description: OK
     */
    route.get('/:id/state', controller.getState);

    /**
     * @swagger
     *
     * /community/{id}/ubi-params:
     *   get:
     *     tags:
     *       - "community"
     *     summary: Get community contract UBI parameters
     *     parameters:
     *       - in: path
     *         name: id
     *         schema:
     *           type: integer
     *         required: true
     *         description: community id
     *     responses:
     *       "200":
     *         description: OK
     */
    route.get('/:id/ubi-params', controller.getUBIParams);

    /**
     * @swagger
     *
     * /community/{id}/managers:
     *   get:
     *     tags:
     *       - "community"
     *     summary: Get community managers
     *     parameters:
     *       - in: query
     *         name: filterByActive
     *         schema:
     *           type: boolean
     *         required: false
     *         description: filter by active/inactive/both (if filterByActive = undefined return both)
     *       - in: path
     *         name: id
     *         schema:
     *           type: integer
     *         required: true
     *         description: community id
     *     responses:
     *       "200":
     *         description: OK
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/getManagersResponse'
     */
    route.get('/:id/managers/:query?', controller.getManagers);
};