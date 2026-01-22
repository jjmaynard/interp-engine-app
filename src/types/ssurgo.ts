/**
 * Type definitions for SSURGO (Soil Survey Geographic Database) data
 * Used for spatial soil interpretation queries
 */

/**
 * SSURGO Map Unit polygon
 */
export interface MapUnit {
  mukey: string;
  muname: string;
  mukind?: string;
  mustatus?: string;
  muacres?: number;
  farmlndcl?: string;
}

/**
 * SSURGO Component (soil type within a map unit)
 */
export interface Component {
  cokey: string;
  mukey: string;
  compname: string;
  comppct_r?: number; // Representative component percentage
  compkind?: string;
  majcompflag?: string;
  slope_r?: number;
  slope_l?: number;
  slope_h?: number;
  slopelenusle_r?: number;
  runoff?: string;
  tfact?: number;
  wei?: string;
  weg?: string;
  erocl?: string;
  earthcovkind?: string;
  hydricon?: string;
  hydricrating?: string;
  drainagecl?: string;
  elev_r?: number;
  aspectrep?: number;
  geomdesc?: string;
  albedodry_r?: number;
  airtempa_r?: number;
  map_r?: number; // Mean annual precipitation
  reannualprecip_r?: number;
  ffd_r?: number; // Frost-free days
  nirrcapcl?: string;
  nirrcapscl?: number;
  nirrcapunit?: string;
  irrcapcl?: string;
  irrcapscl?: number;
  irrcapunit?: string;
  cropprodindex?: number;
  constreeshrubgrp?: string;
  wndbrksuitgrp?: string;
  rsprod_r?: number;
  foragesuitgrpid?: string;
  wlgrain?: string;
  wlgrass?: string;
  wlherbaceous?: string;
  wlshrub?: string;
  wlconiferous?: string;
  wlhardwood?: string;
  wlwetplant?: string;
  wlshallowwat?: string;
  wlrangeland?: string;
  wlopenland?: string;
  wlwoodland?: string;
  wlwetland?: string;
  soilslippot?: string;
  frostact?: string;
  initsub_r?: number;
  totalsub_r?: number;
  hydgrp?: string;
  corcon?: string;
  corsteel?: string;
  taxclname?: string;
  taxorder?: string;
  taxsuborder?: string;
  taxgrtgroup?: string;
  taxsubgrp?: string;
  taxpartsize?: string;
  taxpartsizemod?: string;
  taxceactcl?: string;
  taxreaction?: string;
  taxtempcl?: string;
  taxmoistscl?: string;
  taxtempregime?: string;
  soiltaxedition?: string;
}

/**
 * SSURGO Horizon (soil layer)
 */
export interface Horizon {
  chkey: string;
  cokey: string;
  hzname?: string;
  hzdept_r?: number; // Depth top (cm)
  hzdepb_r?: number; // Depth bottom (cm)
  hzthk_r?: number; // Thickness (cm)
  sandtotal_r?: number;
  sandvc_r?: number;
  sandco_r?: number;
  sandmed_r?: number;
  sandfine_r?: number;
  sandvf_r?: number;
  silttotal_r?: number;
  siltco_r?: number;
  siltfine_r?: number;
  claytotal_r?: number;
  om_r?: number; // Organic matter
  dbthirdbar_r?: number; // Bulk density
  partdensity?: number;
  ksat_r?: number; // Saturated hydraulic conductivity
  awc_r?: number; // Available water capacity
  wthirdbar_r?: number;
  wfifteenbar_r?: number;
  wsatiated_r?: number;
  lep_r?: number; // Linear extensibility percent
  ll_r?: number;
  pi_r?: number;
  aashto_r?: string;
  kwfact?: string;
  kffact?: number;
  caco3_r?: number;
  gypsum_r?: number;
  sar_r?: number; // Sodium adsorption ratio
  ec_r?: number; // Electrical conductivity
  cec7_r?: number;
  ecec_r?: number;
  sumbases_r?: number;
  ph1to1h2o_r?: number;
  ph01mcacl2_r?: number;
  freeiron_r?: number;
  feoxalate_r?: number;
  extracid_r?: number;
  extral_r?: number;
  aloxalate_r?: number;
  pbray1_r?: number;
  poxalate_r?: number;
  ph2osoluble_r?: number;
  ptotal_r?: number;
  excavdifcl?: string;
  excavdifms?: string;
  texture?: string;
  texcl?: string;
}

/**
 * SSURGO Component Restriction (bedrock, hardpan, etc.)
 */
export interface ComponentRestriction {
  reskind?: string;
  reshard?: string;
  resdept_r?: number; // Depth to restriction (cm)
  resdept_l?: number;
  resdept_h?: number;
  resthk_r?: number;
  resthk_l?: number;
  resthk_h?: number;
}

/**
 * Aggregated properties calculated from horizon data
 */
export interface AggregatedProperties {
  cokey: string;
  // Weighted averages in depth range
  sand_wtd_avg?: number;
  silt_wtd_avg?: number;
  clay_wtd_avg?: number;
  om_wtd_avg?: number;
  gypsum_wtd_avg?: number;
  ec_wtd_avg?: number;
  sar_wtd_avg?: number;
  ph_wtd_avg?: number;
  awc_total?: number;
  depth_to_restriction?: number;
  // Min/max values in range
  ph_min?: number;
  ph_max?: number;
}

/**
 * Climate data (external to SSURGO)
 */
export interface ClimateData {
  cokey: string;
  map_mm?: number; // Mean annual precipitation
  mat_c?: number; // Mean annual temperature
  pet_mm?: number; // Potential evapotranspiration
  dryness_index?: number; // MAP / PET
  frost_free_days?: number;
}

/**
 * Complete component data with aggregated properties
 */
export interface ComponentWithProperties extends Component {
  aggregated?: AggregatedProperties;
  climate?: ClimateData;
}
