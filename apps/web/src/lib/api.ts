import { CreateLeadDto, CreateEventDto, CreateStockReservationDto } from '@/shared';
import { fetchAPI } from './auth';

export async function submitLead(data: CreateLeadDto) {
  const response = await fetchAPI('/leads', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }
  return response.json();
}

export async function trackEventAPI(data: CreateEventDto) {
  const response = await fetchAPI('/events', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }
  return response.json();
}

/**
 * Notify all leads about product availability (Admin only)
 */
export async function notifyLeadsAvailability() {
  const response = await fetchAPI('/admin/leads/notify-availability', {
    method: 'POST',
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }
  return response.json();
}

/**
 * Submit stock interest / back-in-stock notification request
 */
export async function submitStockReservation(data: CreateStockReservationDto) {
  const response = await fetchAPI('/stock-reservations', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }
  return response.json();
}
