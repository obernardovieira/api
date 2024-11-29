import { Request, Response } from 'express';
import { services } from '@impactmarket/core';

import { ListCICOProviderRequestSchema } from '~validators/cico';
import { ValidatedRequest } from '~utils/queryValidator';
import { standardResponse } from '~utils/api';

const { CICOProviderService } = services.app;

export const getCICO = (req: Request & ValidatedRequest<ListCICOProviderRequestSchema>, res: Response) => {
    const cicoProviderService = new CICOProviderService();

    cicoProviderService
        .get(req.query)
        .then(r => standardResponse(res, 200, true, r, {}))
        .catch(e => standardResponse(res, 400, false, '', { error: e.message }));
};

export const getNewCICO = (req: Request & ValidatedRequest<ListCICOProviderRequestSchema>, res: Response) => {
    const cicoProviderService = new CICOProviderService();

    cicoProviderService
        .getNew(req.query)
        .then(r => standardResponse(res, 200, true, r, {}))
        .catch(e => standardResponse(res, 400, false, '', { error: e.message }));
};

export const countCICO = (req: Request & ValidatedRequest<ListCICOProviderRequestSchema>, res: Response) => {
    const cicoProviderService = new CICOProviderService();

    cicoProviderService
        .has(req.query)
        .then(r => standardResponse(res, 200, true, r, {}))
        .catch(e => standardResponse(res, 400, false, '', { error: e.message }));
};
