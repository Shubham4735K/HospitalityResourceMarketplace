/**
 * ResShare — Public & Meteorological Weather Signals Service
 * 
 * Provides official public weather signals, alerts, and hazard bulletins.
 * Uses an adapter pattern clearly distinguishing LIVE feeds, DEMO signals, and SIMULATED shock alerts.
 * Never fabricates personal social posts; focuses strictly on institutional and municipal advisories.
 */

export function generatePublicSignals(cityName = 'Bengaluru', shockParams = {}) {
  const intensity = shockParams.rainfallIntensity || 'normal';
  const floodRisk = shockParams.floodRisk || 'low';
  const temp = typeof shockParams.temperature === 'number' ? shockParams.temperature : 28;
  const duration = shockParams.stormDuration || 6;

  const now = new Date();
  const formatTimeAgo = (minutes) => {
    const d = new Date(now.getTime() - minutes * 60000);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const signals = [];

  // Severe Storm / Torrential Rain Scenario
  if (intensity === 'extreme' || floodRisk === 'high') {
    signals.push({
      id: 'sig-01',
      source: 'State Disaster Management Authority (SDMA)',
      agencyType: 'Government Meteorological Authority',
      title: `Red Alert: Severe Inundation & Flash Flood Advisory for ${cityName}`,
      description: `Meteorological radars indicate localized precipitation exceeding 75mm/h. Hospitality operators advised to suspend outdoor lawn banquets and secure mobile infrastructure.`,
      severity: 'Critical',
      status: 'SIMULATED ADVISORY',
      timestamp: formatTimeAgo(12),
      confidence: '95% (Multi-model Consensus)',
      recommendedAction: 'Relocate outdoor bookings to certified indoor ballrooms with generator backup.'
    });

    signals.push({
      id: 'sig-02',
      source: 'City Municipal Corporation & Traffic Control',
      agencyType: 'Urban Transit & Safety Board',
      title: 'Waterlogging Reported on Primary Arterial Corridors',
      description: `Transit delays projected across hospitality logistics routes. Food service deliveries and perishable transfers facing +45m dispatch lead times.`,
      severity: 'High',
      status: 'SIMULATED ADVISORY',
      timestamp: formatTimeAgo(35),
      confidence: '91%',
      recommendedAction: 'Utilize nearby cold storage buffers and deploy refrigerated trailers on site.'
    });
  } else if (intensity === 'heavy' || floodRisk === 'medium') {
    signals.push({
      id: 'sig-03',
      source: 'Regional Meteorological Centre (IMD)',
      agencyType: 'National Weather Bureau',
      title: `Orange Alert: Sustained Squall & Heavy Rain Forecast for ${cityName}`,
      description: `Continuous rainfall projected for the next ${duration} hours with wind gusts up to 48 km/h. Open-air terraces and rooftop venues face severe disruption.`,
      severity: 'High',
      status: 'SIMULATED ADVISORY',
      timestamp: formatTimeAgo(24),
      confidence: '88%',
      recommendedAction: 'Initiate contingency hold on indoor auxiliary spaces.'
    });
  }

  // Extreme Heat Scenario
  if (temp >= 38) {
    signals.push({
      id: 'sig-04',
      source: 'National Heatwave Mitigation Taskforce',
      agencyType: 'Public Health & Meteorological Bureau',
      title: `Severe Heatwave Warning: Peak Anomaly (+${Math.round(temp - 30)}°C) in ${cityName}`,
      description: `Extreme daytime ambient temperatures of ${temp}°C require intensified cold chain maintenance. Commercial kitchens advised to monitor cold storage compressor thresholds.`,
      severity: temp >= 42 ? 'Critical' : 'High',
      status: 'SIMULATED ADVISORY',
      timestamp: formatTimeAgo(45),
      confidence: '94%',
      recommendedAction: 'Engage auxiliary shock freezers and blast chillers to maintain strict HACCP cold compliance.'
    });
  }

  // General Institutional Standing Feeds (Demo / Live baseline)
  signals.push({
    id: 'sig-05',
    source: 'Federation of Hotel & Restaurant Associations (FHRAI)',
    agencyType: 'Industry Hospitality Guild',
    title: `B2B Resource Sharing Protocol: Regional Preparedness Grid`,
    description: `Active cross-business sharing protocol enabled for commercial cold rooms, backup generators, and indoor banquet relief capacity across ${cityName}.`,
    severity: 'Advisory',
    status: 'DEMO / INSTITUTIONAL FEED',
    timestamp: formatTimeAgo(110),
    confidence: 'Verified Partner Network',
    recommendedAction: 'Review marketplace digital twin metrics before confirming high-risk dates.'
  });

  signals.push({
    id: 'sig-06',
    source: 'National Power Grid & Utilities Monitoring',
    agencyType: 'Public Utilities Transmission Agency',
    title: `Substation Stability Monitor: ${cityName} Central Distribution`,
    description: intensity === 'extreme' 
      ? 'Grid strain detected; micro-outages possible in commercial hotel belts.' 
      : 'Regional grid operating within nominal voltage stability parameters (50.02 Hz).',
    severity: intensity === 'extreme' ? 'High' : 'Normal',
    status: intensity === 'extreme' ? 'SIMULATED ADVISORY' : 'DEMO / INSTITUTIONAL FEED',
    timestamp: formatTimeAgo(180),
    confidence: 'Telemetry Stream',
    recommendedAction: intensity === 'extreme' ? 'Pre-warm backup diesel generators.' : 'Standard operations.'
  });

  return signals;
}
