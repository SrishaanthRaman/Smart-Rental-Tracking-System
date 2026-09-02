import axios from "axios";

const API_BASE_URL = "http://localhost:8000";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export interface Telemetry {
  telemetry_id: string;
  timestamp: string;
  equipment_id: string;
  longitude: number;
  engine_status: string;
  engine_hours: number;
  operating_hours: number;
  utilization_pct: number;
  maintenance_status: string;
  rental_id: string;
  fuel_efficiency?: number | null;
  anomaly_injected?: boolean | null;
}

export interface Prediction {
  telemetry_id: string;
  predicted_maintenance_status: string;
  predicted_anomaly: boolean;
  confidence: number;
}

export interface Rental {
  id: string;
  equipment_id: string;
  checkout_datetime: string;
  expected_return_datetime: string;
  checkin_datetime?: string | null;
  rental_status_generated: string;
}

export interface RentalListResponse {
  total: number;
  skip: number;
  limit: number;
  rentals: Rental[];
}

export interface DemandPrediction {
  site_id: string;
  model: string;
  date: string;
  predicted_demand: number;
}

export async function getEquipmentHistory(
  equipmentId: string,
  skip = 0,
  limit = 100
): Promise<Telemetry[]> {
  const response = await api.get<Telemetry[]>(
    `/equipment/${equipmentId}/history`,
    {
      params: {
        skip,
        limit,
      },
    }
  );

  return response.data;
}

export async function getRental(
  rentalId: string
): Promise<Rental> {
  const response = await api.get<Rental>(
    `/rental/${rentalId}`
  );

  return response.data;
}

export async function getRentals(
  skip = 0,
  limit = 100
): Promise<RentalListResponse> {
  const response = await api.get<RentalListResponse>(
    "/rentals",
    {
      params: {
        skip,
        limit,
      },
    }
  );

  return response.data;
}

export async function predictMaintenance(
  telemetry: Telemetry
): Promise<Prediction> {
  const response = await api.post<Prediction>(
    "/predict/",
    telemetry
  );

  return response.data;
}

export async function predictDemand(
  siteId: string,
  model: string,
  date: string
): Promise<DemandPrediction> {
  const response = await api.post<DemandPrediction>(
    "/predict-demand/",
    null,
    {
      params: {
        site_id: siteId,
        model,
        date,
      },
    }
  );

  return response.data;
}