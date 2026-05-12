import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import ProxyCheck from 'proxycheck-ts';

@Injectable()
export class IpAnalysisService {
  private readonly logger = new Logger(IpAnalysisService.name);
  private readonly proxyCheck: ProxyCheck;

  constructor(private readonly configService: ConfigService) {
    this.proxyCheck = new ProxyCheck({
      api_key: this.configService.get<string>('PROXYCHECK_API_KEY', ''),
    });
  }

  /**
   * Analyze an IP address for proxy/VPN usage and geolocation.
   * Uses ProxyCheck.io via the proxycheck-ts SDK.
   * Returns safe defaults on any failure so the fraud pipeline never crashes.
   */
  async analyze(ip: string): Promise<{
    ip_reputation_score: number;
    is_vpn: boolean;
    is_proxy: boolean;
    geolocation: { country: string; city: string; lat: number; lng: number };
  }> {
    try {
      const result = await this.proxyCheck.checkIP(ip, {
        vpn: 3,   // highest VPN detection accuracy
        asn: 1,   // include ASN + geolocation data
        risk: 1,  // return the risk score (0-100)
      });

      const ipData = result[ip];

      if (!ipData) {
        this.logger.warn(`ProxyCheck returned no data for IP: ${ip}`);
        return this.fallback();
      }

      return {
        ip_reputation_score: typeof ipData.risk === 'number' ? ipData.risk : 50,
        is_vpn: ipData.vpn === 'yes',
        is_proxy: ipData.proxy === 'yes',
        geolocation: {
          country: ipData.country ?? 'Unknown',
          city: ipData.city ?? 'Unknown',
          lat: typeof ipData.latitude === 'number' ? ipData.latitude : parseFloat(ipData.latitude) || 0,
          lng: typeof ipData.longitude === 'number' ? ipData.longitude : parseFloat(ipData.longitude) || 0,
        },
      };
    } catch (error) {
      this.logger.warn(
        `ProxyCheck API call failed for IP ${ip}: ${error instanceof Error ? error.message : String(error)}. Using fallback values.`,
      );
      return this.fallback();
    }
  }

  /** Safe default values when the API is unavailable or returns an error. */
  private fallback() {
    return {
      ip_reputation_score: 50,
      is_vpn: false,
      is_proxy: false,
      geolocation: { country: 'NG', city: 'Unknown', lat: 0, lng: 0 },
    };
  }
}
