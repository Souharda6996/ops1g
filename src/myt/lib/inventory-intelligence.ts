import { Lead, Property, Room, RoomBlock, Tour, TeamMember, Zone, Booking } from "./types";
import { properties, rooms as allRooms } from "./properties-seed";
import { teamMembers, zones, tours as allTours } from "./mock-data";

export interface InventoryFit {
  propertyId: string;
  propertyName: string;
  availableBeds: number;
  distanceKm: number | null;
  area: string;
  basePrice: number;
  score: number;
  reason: string;
}

export function detectAreaZone(text: string): Zone {
  const normalized = text.toLowerCase();
  const matched = zones.find(z => 
    normalized.includes(z.area.toLowerCase()) || 
    normalized.includes(z.name.toLowerCase())
  );
  return matched || zones[zones.length - 1]; // Fallback to last zone (Others)
}

interface BestFitOptions {
  areaText: string;
  budget?: number;
  room?: string;
  rooms: Room[];
  blocks: RoomBlock[];
  limit?: number;
}

export function bestInventoryFits({ areaText, budget, room, rooms, blocks, limit = 3 }: BestFitOptions): InventoryFit[] {
  const zone = detectAreaZone(areaText);
  
  const fits = properties.map(p => {
    let score = 0;
    const reasons: string[] = [];
    
    // 1. Area Match
    if (p.area.toLowerCase() === zone.area.toLowerCase()) {
      score += 50;
      reasons.push("Exact area match");
    } else if (p.zoneId === zone.id) {
      score += 30;
      reasons.push("Same zone");
    }

    // 2. Availability
    const propRooms = rooms.filter(r => r.propertyId === p.id);
    const availableBeds = propRooms.reduce((sum, r) => sum + (r.bedsTotal - r.bedsOccupied), 0);
    const activeBlocks = blocks.filter(b => b.propertyId === p.id && b.status === 'active').length;
    const netAvailable = Math.max(0, availableBeds - activeBlocks);

    if (netAvailable > 0) {
      score += 20;
      reasons.push(`${netAvailable} beds available`);
    } else {
      score -= 50;
      reasons.push("No vacancy");
    }

    // 3. Price Fit
    if (budget && budget >= p.basePrice) {
      score += 20;
      reasons.push("Budget match");
    } else if (budget && budget < p.basePrice) {
      score -= 20;
      reasons.push("Price above budget");
    }

    return {
      propertyId: p.id,
      propertyName: p.name,
      availableBeds: netAvailable,
      distanceKm: p.area === zone.area ? 0.5 : 2.5, // Mock distance
      area: p.area,
      basePrice: p.basePrice,
      score,
      reason: reasons.join(", ")
    };
  });

  return fits
    .filter(f => f.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function recommendedFlowOps(zoneId: string): TeamMember | undefined {
  return teamMembers.find(m => m.role === 'flow-ops' && m.zoneId === zoneId);
}

export function recommendedTcm(tours: Tour[], zoneId: string): TeamMember | undefined {
  // Pick TCM in zone with least tours today
  const tcmsInZone = teamMembers.filter(m => m.role === 'tcm' && m.zoneId === zoneId);
  const today = new Date().toISOString().split('T')[0];
  const tcmLoad = tcmsInZone.map(tcm => ({
    tcm,
    load: tours.filter(t => t.assignedTo === tcm.id && t.tourDate === today).length
  }));
  return tcmLoad.sort((a, b) => a.load - b.load)[0]?.tcm;
}

export function getAreaDemandPressure() {
  const areaStats = zones.map(zone => {
    const areaProps = properties.filter(p => p.zoneId === zone.id);
    const areaRooms = allRooms.filter(r => areaProps.some(p => p.id === r.propertyId));
    const totalVacancy = areaRooms.reduce((sum, r) => sum + (r.bedsTotal - r.bedsOccupied), 0);
    const demand = allTours.filter(t => t.zoneId === zone.id).length;
    
    return {
      area: zone.area,
      totalVacancy,
      demand,
      pressure: totalVacancy > 15 ? "high-supply" : totalVacancy < 5 ? "high-demand" : "balanced"
    };
  });
  return areaStats;
}

interface OperatingData {
  leads: Lead[];
  tours: Tour[];
  rooms: Room[];
  blocks: RoomBlock[];
  bookings: Booking[];
}

export function buildAreaOperatingRows({ leads, tours, rooms, blocks, bookings }: OperatingData) {
  const today = new Date().toISOString().split('T')[0];
  
  return zones.map(zone => {
    const zoneLeads = leads.filter(l => detectAreaZone(l.area).id === zone.id).length;
    const zoneTours = tours.filter(t => t.zoneId === zone.id && t.tourDate === today).length;
    const zoneProps = properties.filter(p => p.zoneId === zone.id);
    const zoneRooms = rooms.filter(r => zoneProps.some(p => p.id === r.propertyId));
    const availableBeds = zoneRooms.reduce((sum, r) => sum + (r.bedsTotal - r.bedsOccupied), 0);
    const tcmCount = teamMembers.filter(m => m.role === 'tcm' && m.zoneId === zone.id).length;
    const bookingsCount = bookings.filter(b => b.area === zone.area && b.createdAt.startsWith(today)).length;
    
    let signal = "Balanced";
    let nextAction = "Monitor funnel";
    
    if (availableBeds > 10 && zoneLeads < 5) {
      signal = "High Supply";
      nextAction = "Push marketing for leads";
    } else if (zoneLeads > 15 && availableBeds < 3) {
      signal = "High Demand";
      nextAction = "Talk to owners for rooms";
    } else if (zoneTours < 2 && zoneLeads > 5) {
      signal = "Low Conversion";
      nextAction = "Flow Ops: Schedule tours now";
    }

    return {
      zoneId: zone.id,
      area: zone.area,
      leads: zoneLeads,
      toursToday: zoneTours,
      availableBeds,
      tcmCapacity: tcmCount * 5, // 5 tours per TCM per day
      bookings: bookingsCount,
      signal,
      nextAction
    };
  });
}

export const supplyHubProperties = properties;

export function availableBedsForProperty(propertyId: string, rooms: Room[], blocks: RoomBlock[]) {
  const propRooms = rooms.filter(r => r.propertyId === propertyId);
  const total = propRooms.reduce((sum, r) => sum + (r.bedsTotal - r.bedsOccupied), 0);
  const activeBlocks = blocks.filter(b => b.propertyId === propertyId && b.status === 'active').length;
  return {
    beds: Math.max(0, total - activeBlocks),
    total
  };
}