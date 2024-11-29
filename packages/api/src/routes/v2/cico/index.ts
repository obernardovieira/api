import { Router } from 'express';

import { countCICO, getNewCICO } from '~controllers/v2/cico';
import { listCICOProviderValidator } from '~validators/cico';

export default (app: Router): void => {
    const route = Router();
    app.use('/new-cico', route);

    /**
     * @swagger
     *
     * /new-cico/count:
     *   get:
     *     tags:
     *       - "cico"
     *     summary: Get cash-in/cash-out providers
     *     parameters:
     *       - in: query
     *         name: country
     *         schema:
     *           type: string
     *         required: false
     *         description: filter by country
     *       - in: query
     *         name: lat
     *         schema:
     *           type: number
     *         required: false
     *         description: latitude used for nearest location
     *       - in: query
     *         name: lng
     *         schema:
     *           type: number
     *         required: false
     *         description: longitude used for nearest location
     *       - in: query
     *         name: distance
     *         schema:
     *           type: number
     *         required: false
     *         description: distance in kilometers between the user location and providers
     *     responses:
     *       "200":
     *         description: OK
     */
    route.get('/count/:query?', listCICOProviderValidator, countCICO);

    /**
     * @swagger
     *
     * /new-cico:
     *   get:
     *     tags:
     *       - "cico"
     *     summary: Get cash-in/cash-out providers
     *     parameters:
     *       - in: query
     *         name: country
     *         schema:
     *           type: string
     *         required: false
     *         description: filter by country
     *       - in: query
     *         name: lat
     *         schema:
     *           type: number
     *         required: false
     *         description: latitude used for nearest location
     *       - in: query
     *         name: lng
     *         schema:
     *           type: number
     *         required: false
     *         description: longitude used for nearest location
     *       - in: query
     *         name: distance
     *         schema:
     *           type: number
     *         required: false
     *         description: distance in kilometers between the user location and providers
     *       - in: query
     *         name: type
     *         schema:
     *           type: number
     *         required: true
     *         description: type of cico to fetch
     *       - in: query
     *         name: offset
     *         schema:
     *           type: integer
     *         required: false
     *         description: offset used for pagination
     *       - in: query
     *         name: limit
     *         schema:
     *           type: integer
     *         required: false
     *         description: limit used for pagination
     *     responses:
     *       "200":
     *         description: OK
     */
    route.get('/:query?', listCICOProviderValidator, getNewCICO);
};
