import { RequestWithUser } from '@ipcttypes/core';
import StoryService from '@services/story';
import { standardResponse } from '@utils/api';
import { Request, Response } from 'express';

class StoryController {
    storyService = new StoryService();

    pictureAdd = (req: RequestWithUser, res: Response) => {
        if (req.user === undefined) {
            standardResponse(res, 401, false, '', {
                error: 'User not identified!',
            });
            return;
        }
        this.storyService
            .pictureAdd(req.file)
            .then((r) => standardResponse(res, 200, true, r))
            .catch((e) => standardResponse(res, 400, false, '', { error: e }));
    };

    add = (req: RequestWithUser, res: Response) => {
        if (req.user === undefined) {
            standardResponse(res, 401, false, '', {
                error: 'User not identified!',
            });
            return;
        }
        this.storyService
            .add(req.user.address, req.body)
            .then((r) => standardResponse(res, 200, true, r))
            .catch((e) => standardResponse(res, 400, false, '', { error: e }));
    };

    has = (req: RequestWithUser, res: Response) => {
        if (req.user === undefined) {
            standardResponse(res, 401, false, '', {
                error: 'User not identified!',
            });
            return;
        }
        this.storyService
            .has(req.user.address)
            .then((r) => standardResponse(res, 200, true, r))
            .catch((e) => standardResponse(res, 400, false, '', { error: e }));
    };

    remove = (req: RequestWithUser, res: Response) => {
        if (req.user === undefined) {
            standardResponse(res, 401, false, '', {
                error: 'User not identified!',
            });
            return;
        }
        this.storyService
            .remove(parseInt(req.params.id, 10), req.user.address)
            .then((r) => standardResponse(res, 200, r !== 0, r))
            .catch((e) => standardResponse(res, 400, false, '', { error: e }));
    };

    listUserOnly = (req: RequestWithUser, res: Response) => {
        if (req.user === undefined) {
            standardResponse(res, 401, false, '', {
                error: 'User not identified!',
            });
            return;
        }
        this.storyService
            .listByUser(req.params.order, req.query, req.user.address)
            .then((r) => standardResponse(res, 200, true, r))
            .catch((e) => standardResponse(res, 400, false, '', { error: e }));
    };

    listImpactMarketOnly = (req: RequestWithUser, res: Response) => {
        this.storyService
            .listImpactMarketOnly(req.user?.address)
            .then((r) => standardResponse(res, 200, true, r))
            .catch((e) => standardResponse(res, 400, false, '', { error: e }));
    };

    listByOrder = (req: Request, res: Response) => {
        this.storyService
            .listByOrder(req.params.order, req.query)
            .then((r) => standardResponse(res, 200, true, r))
            .catch((e) => standardResponse(res, 400, false, '', { error: e }));
    };

    getByCommunity = (req: RequestWithUser, res: Response) => {
        this.storyService
            .getByCommunity(
                parseInt(req.params.id, 10),
                req.params.order,
                req.query,
                req.user?.address
            )
            .then((r) => standardResponse(res, 200, true, r))
            .catch((e) => standardResponse(res, 400, false, '', { error: e }));
    };

    love = (req: RequestWithUser, res: Response) => {
        if (req.user === undefined) {
            standardResponse(res, 401, false, '', {
                error: 'User not identified!',
            });
            return;
        }
        this.storyService
            .love(req.user.address, parseInt(req.params.id, 10))
            .then((r) => standardResponse(res, 200, true, r))
            .catch((e) => standardResponse(res, 400, false, '', { error: e }));
    };

    inapropriate = (req: RequestWithUser, res: Response) => {
        if (req.user === undefined) {
            standardResponse(res, 401, false, '', {
                error: 'User not identified!',
            });
            return;
        }
        this.storyService
            .inapropriate(req.user.address, parseInt(req.params.id, 10))
            .then((r) => standardResponse(res, 200, true, r))
            .catch((e) => standardResponse(res, 400, false, '', { error: e }));
    };
}

export default StoryController;
