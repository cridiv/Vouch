import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class BehaviourService {
  constructor(private readonly prisma: PrismaService) {}

  private calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  }
  async analyze(
    platformUserId: string,
    currentGeo: { country: string; city: string; lat: number; lng: number },
    transactionAmount: number,
  ) {
    // Fetch the user to get their creation date
    const platformUser = await this.prisma.platformUser.findUnique({
      where: { id: platformUserId },
    });

    if (!platformUser) {
      throw new Error(`Platform user ${platformUserId} not found`);
    }

    // Compute account age in days
    const today = new Date();
    const createdAt = platformUser.createdAt;
    const diffTimeMs = Math.abs(today.getTime() - createdAt.getTime());
    const account_age_days = Math.floor(diffTimeMs / (1000 * 60 * 60 * 24));

    // Fetch previous transactions (Fraud Assessments)
    const previous_transactions = await this.prisma.fraudAssessment.count({
      where: { platformUserId },
    });

    // Fetch the most recent transaction to compute time_since_last_tx_hrs
    const mostRecentAssessment = await this.prisma.fraudAssessment.findFirst({
      where: { platformUserId },
      orderBy: { createdAt: 'desc' },
    });

    let time_since_last_tx_hrs: number | null = null;
    if (mostRecentAssessment) {
      const diffTxTimeMs = Math.abs(today.getTime() - mostRecentAssessment.createdAt.getTime());
      time_since_last_tx_hrs = diffTxTimeMs / (1000 * 60 * 60);
    }

    // Compute location distance (Haversine formula)
    let location_distance_km = 0;
    const onboardingLoc = platformUser.onboardingLocation as any;
    if (onboardingLoc && typeof onboardingLoc.lat === 'number' && typeof onboardingLoc.lng === 'number') {
      location_distance_km = this.calculateHaversineDistance(
        onboardingLoc.lat,
        onboardingLoc.lng,
        currentGeo.lat,
        currentGeo.lng,
      );
    }

    // Determine impossible travel
    const impossible_travel =
      location_distance_km > 800 && time_since_last_tx_hrs !== null && time_since_last_tx_hrs < 2;

    return {
      createdAt,
      account_age_days,
      previous_transactions,
      time_since_last_tx_hrs,
      location_distance_km,
      impossible_travel,
    };
  }
}
