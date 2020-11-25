import BigNumber from 'bignumber.js';
import ClaimService from '../../services/claim';
import InflowService from '../../services/inflow';
import GlobalDailyStateService from '../../services/globalDailyState';
import CommunityDailyStateService from '../../services/communityDailyState';
import CommunityContractService from '../../services/communityContract';
import ReachedAddressService from '../../services/reachedAddress';
import CommunityDailyMetricsService from '../../services/communityDailyMetrics';
import BeneficiaryTransactionService from '../../services/beneficiaryTransaction';
import Logger from '../../loaders/logger';
import config from '../../config';
import { mean } from 'mathjs';


/**
 * As this is all calculated past midnight, everything is from yesterdayDateOnly
 */
export async function calcuateGlobalMetrics(): Promise<void> {
    Logger.info('Calculating global metrics...');
    const yesterdayDateOnly = new Date(new Date().getTime() - 86400000); // yesterdayDateOnly
    const lastGlobalMetrics = await GlobalDailyStateService.getLast();
    const last4DaysAvgSSI = await GlobalDailyStateService.getLast4AvgMedianSSI();
    const communitiesYesterday = await CommunityDailyStateService.getYesterdayCommunitiesSum();
    const volumeTransactionsAndAddresses = await BeneficiaryTransactionService.getAllByDay(yesterdayDateOnly);
    const backersAndFunding = await InflowService.uniqueBackersAndFundingLast30Days();
    const communitiesAvgYesterday = await CommunityDailyMetricsService.getCommunitiesAvgYesterday();

    const monthlyClaimed = await ClaimService.getMonthlyClaimed();
    const monthlyRaised = await InflowService.getMonthlyRaised();

    // inflow / outflow
    const totalRaised = new BigNumber(lastGlobalMetrics.totalRaised).plus(communitiesYesterday.totalRaised).toString();
    const totalDistributed = new BigNumber(lastGlobalMetrics.totalDistributed).plus(communitiesYesterday.totalClaimed).toString();
    const totalBackers = await InflowService.countEvergreenBackers();
    const totalBeneficiaries = lastGlobalMetrics.totalBeneficiaries + communitiesYesterday.totalBeneficiaries;

    // ubi pulse
    const givingRate = parseFloat(
        new BigNumber(backersAndFunding.funding)
            .dividedBy(10 ** config.cUSDDecimal) // set 18 decimals from onchain values
            .dividedBy(backersAndFunding.backers)
            .dividedBy(30)
            .decimalPlaces(2, 1)
            .toString()
    );
    const ubiRate = communitiesAvgYesterday.avgUbiRate;
    const avgComulativeUbi = await CommunityContractService.avgComulativeUbi();
    // const avgUbiDuration = parseFloat(
    //     new BigNumber(avgComulativeUbi)
    //         .dividedBy(10 ** config.cUSDDecimal) // set 18 decimals from onchain values
    //         .dividedBy(ubiRate)
    //         .dividedBy(30)
    //         .decimalPlaces(2, 1)
    //         .toString()
    // );
    const avgUbiDuration = communitiesAvgYesterday.avgEstimatedDuration;

    // economic activity
    const volume = volumeTransactionsAndAddresses.volume;
    const transactions = volumeTransactionsAndAddresses.transactions;
    const reach = volumeTransactionsAndAddresses.uniqueAddressesReached.length;
    // TODO: spending rate
    const spendingRate = 0;

    // chart data by day, all communities sum
    // remaining data are in communitiesYesterday
    const fundingRate = parseFloat(
        new BigNumber(monthlyRaised)
            .minus(monthlyClaimed)
            .dividedBy(monthlyRaised)
            .multipliedBy(100)
            .toFixed(2, 1)
    );
    const totalVolume = new BigNumber(lastGlobalMetrics.totalVolume).plus(volume).toString();
    const totalTransactions = new BigNumber(lastGlobalMetrics.totalTransactions.toString()).plus(transactions).toString();
    const totalReach = await ReachedAddressService.getAllReachedEver();

    const avgMedianSSI = mean(last4DaysAvgSSI.concat([communitiesAvgYesterday.medianSSI]));
    // register new global daily state
    await GlobalDailyStateService.add(
        yesterdayDateOnly,
        Math.round(avgMedianSSI * 100) / 100,
        communitiesYesterday.totalClaimed,
        communitiesYesterday.totalClaims,
        communitiesYesterday.totalBeneficiaries,
        communitiesYesterday.totalRaised,
        backersAndFunding.backers,
        volume,
        transactions,
        reach,
        totalRaised,
        totalDistributed,
        totalBackers,
        totalBeneficiaries,
        givingRate,
        Math.round(ubiRate * 100) / 100,
        fundingRate,
        spendingRate,
        avgComulativeUbi,
        avgUbiDuration,
        totalVolume,
        BigInt(totalTransactions),
        BigInt(totalReach),
    );
}
