import { Router } from 'express';

import { getCICO } from '~controllers/v2/cico';
import { listCICOProviderValidator } from '~validators/cico';

export default (app: Router): void => {
    const route = Router();
    app.use('/cico', route);

    /**
     * @swagger
     *
     * /cico:
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
    route.get('/:query?', listCICOProviderValidator, getCICO);
};
