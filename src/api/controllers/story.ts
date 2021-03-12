import { controllerLogAndFail } from '@utils/api';
import { Request, Response } from 'express';
import StoryService from '@services/story';
import { RequestWithUser } from '@ipcttypes/core';

class StoryController {
    storyService = new StoryService();

    add = (req: Request, res: Response) => {
        this.storyService
            .add(req.file, req.body)
            .then((r) => res.send(r))
            .catch((e) => controllerLogAndFail(e, 400, res));
    };

    has = (req: RequestWithUser, res: Response) => {
        if (req.user === undefined) {
            controllerLogAndFail('User not identified!', 400, res);
            return;
        }
        this.storyService
            .has(req.user.address)
            .then((r) => res.send(r))
            .catch((e) => controllerLogAndFail(e, 400, res));
    };

    remove = (req: RequestWithUser, res: Response) => {
        if (req.user === undefined) {
            controllerLogAndFail('User not identified!', 400, res);
            return;
        }
        this.storyService
            .remove(req.body.contentId, req.user.address)
            .then((r) => (r === 0 ? res.sendStatus(400) : res.sendStatus(200)))
            .catch((e) => controllerLogAndFail(e, 400, res));
    };

    listUserOnly = (req: RequestWithUser, res: Response) => {
        if (req.user === undefined) {
            controllerLogAndFail('User not identified!', 400, res);
            return;
        }
        this.storyService
            .listByUser(req.params.order, req.query, req.user.address)
            .then((r) => res.send(r))
            .catch((e) => controllerLogAndFail(e, 400, res));
    };

    listByOrder = (req: Request, res: Response) => {
        this.storyService
            .listByOrder(req.params.order, req.query)
            .then((r) => res.send(r))
            .catch((e) => controllerLogAndFail(e, 400, res));
    };

    getByCommunity = (req: RequestWithUser, res: Response) => {
        this.storyService
            .getByCommunity(
                parseInt(req.params.id, 10),
                req.params.order,
                req.query,
                req.user?.address
            )
            .then((r) => res.send(r))
            .catch((e) => controllerLogAndFail(e, 400, res));
    };

    love = (req: RequestWithUser, res: Response) => {
        if (req.user === undefined) {
            controllerLogAndFail('User not identified!', 400, res);
            return;
        }
        this.storyService
            .love(req.user.address, req.body.contentId)
            .then((r) => res.send(r))
            .catch((e) => controllerLogAndFail(e, 400, res));
    };
}

export default StoryController;
