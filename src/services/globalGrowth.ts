import { GlobalGrowth, GlobalGrowthCreation } from '@interfaces/globalGrowth';

import { models } from '../database';

export default class GlobalGrowthService {
    public globalGrowth = models.globalGrowth;

    public async add(state: GlobalGrowthCreation): Promise<GlobalGrowth> {
        return await this.globalGrowth.create(state);
    }

    public async getLast(): Promise<GlobalGrowth> {
        // it was null just once at the system's begin.
        const last = await this.globalGrowth.findAll({
            order: [['date', 'DESC']],
            limit: 1,
        });
        return last[0];
    }
}
