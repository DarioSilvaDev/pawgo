import { EventType } from '../enums/event-type';

export interface Event {
  id: string;
  type: EventType;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface CreateEventDto {
  type: EventType;
  metadata?: Record<string, unknown>;
}

