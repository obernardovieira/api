import {
    GlobalDemographics,
    GlobalDemographicsCreationAttributes,
} from '@models/globalDemographics';
import { QueryTypes } from 'sequelize';

import { models, sequelize } from '../database';

export default class GlobalDemographicsService {
    public static globalDemographics = models.globalDemographics;
    public static sequelize = sequelize;

    public static async add(
        demographics: GlobalDemographicsCreationAttributes
    ): Promise<GlobalDemographics> {
        return await this.globalDemographics.create(demographics);
    }

    public static async getLast(): Promise<GlobalDemographics[]> {
        return await this.sequelize.query<GlobalDemographics>(
            `select * from globaldemographics where date = (select date from globaldemographics order by date desc limit 1)`,
            { type: QueryTypes.SELECT }
        );
    }

    public static async calculateDemographics(): Promise<void> {
        const yesterdayDateOnly = new Date(new Date().getTime() - 86400000);
        yesterdayDateOnly.setHours(0, 0, 0, 0);

        const newDemographics: GlobalDemographicsCreationAttributes[] = [];

        const sqlAgeRangeQuery = `WITH current_date_year (current_year) as (
            values (EXTRACT(YEAR from now()))
         )
         select c.country
              , count(*) FILTER (WHERE current_year-u.year BETWEEN 18 AND 24) AS "ageRange1"
              , count(*) FILTER (WHERE current_year-u.year BETWEEN 25 AND 34) AS "ageRange2"
              , count(*) FILTER (WHERE current_year-u.year BETWEEN 35 AND 44) AS "ageRange3"
              , count(*) FILTER (WHERE current_year-u.year BETWEEN 45 AND 54) AS "ageRange4"
              , count(*) FILTER (WHERE current_year-u.year BETWEEN 55 AND 64) AS "ageRange5"
              , count(*) FILTER (WHERE current_year-u.year BETWEEN 65 AND 120) AS "ageRange6"
         from "user" u, "current_date_year", beneficiary b, community c
         where u.address = b.address
         and b."communityId" = c."publicId"
         and c.visibility = 'public'
         and c.status = 'valid'
         group by c.country`;

        const sqlGenderQuery = `select u.gender, count(u.gender) total, c.country
        from "user" u, beneficiary b, community c
        where (u.gender = 'f' or u.gender = 'm')
        and u.address = b.address
        and b."communityId" = c."publicId"
        group by c.country, u.gender
        order by c.country`;

        // query data
        const rawAgeRange = await this.sequelize.query<{
            country: string;
            ageRange1: number;
            ageRange2: number;
            ageRange3: number;
            ageRange4: number;
            ageRange5: number;
            ageRange6: number;
        }>(sqlAgeRangeQuery, { type: QueryTypes.SELECT });
        const rawGender = await this.sequelize.query<{
            gender: string;
            total: number;
            country: string;
        }>(sqlGenderQuery, { type: QueryTypes.SELECT });

        // format gender results for easier write
        const countries: string[] = [];
        const gender = new Map<string, { male: number; female: number }>();
        for (let g = 0; g < rawGender.length; g++) {
            const element = rawGender[g];

            countries.push(element.country);
            let previous = gender.get(element.country);
            if (previous === undefined) {
                previous = { male: 0, female: 0 };
            }
            if (element.gender === 'f') {
                gender.set(element.country, {
                    ...previous,
                    female: element.total,
                });
            } else if (element.gender === 'm') {
                gender.set(element.country, {
                    ...previous,
                    male: element.total,
                });
            }
        }

        const ageRange = new Map<
            string,
            {
                ageRange1: number;
                ageRange2: number;
                ageRange3: number;
                ageRange4: number;
                ageRange5: number;
                ageRange6: number;
            }
        >();
        for (let a = 0; a < rawAgeRange.length; a++) {
            const element = rawAgeRange[a];
            countries.push(element.country);
            ageRange.set(element.country, {
                ageRange1: element.ageRange1,
                ageRange2: element.ageRange2,
                ageRange3: element.ageRange3,
                ageRange4: element.ageRange4,
                ageRange5: element.ageRange5,
                ageRange6: element.ageRange6,
            });
        }

        const uniqueCountries = Array.from(new Set(countries));
        for (let a = 0; a < uniqueCountries.length; a++) {
            newDemographics.push({
                date: yesterdayDateOnly,
                country: uniqueCountries[a],
                ...ageRange.get(uniqueCountries[a])!,
                ...gender.get(uniqueCountries[a])!,
            });
        }

        await this.globalDemographics.bulkCreate(newDemographics);
    }
}
