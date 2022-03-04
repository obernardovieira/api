import { services } from '@impactmarket/core';
import { Request, Response } from 'express';

import { standardResponse } from '../../../utils/api';

class CommunityController {
    private detailsService: services.ubi.CommunityDetailsService;
    constructor() {
        this.detailsService = new services.ubi.CommunityDetailsService();
    }

    getState = (req: Request, res: Response) => {
        this.detailsService
            .getState(parseInt(req.params.id, 10))
            .then((r) => standardResponse(res, 200, true, r))
            .catch((e) => standardResponse(res, 400, false, '', { error: e }));
    };

    getUBIParams = (req: Request, res: Response) => {
        this.detailsService
            .getUBIParams(parseInt(req.params.id, 10))
            .then((r) => standardResponse(res, 200, true, r))
            .catch((e) => standardResponse(res, 400, false, '', { error: e }));
    };

    getManagers = (req: Request, res: Response) => {
        const { filterByActive } = req.query;
        let active: boolean | undefined;
        if (filterByActive === 'true') {
            active = true;
        } else if (filterByActive === 'false') {
            active = false;
        }

        this.detailsService
            .getManagers(parseInt(req.params.id, 10), active)
            .then((r) => standardResponse(res, 200, true, r))
            .catch((e) => standardResponse(res, 400, false, '', { error: e }));
    };
}

export { CommunityController };