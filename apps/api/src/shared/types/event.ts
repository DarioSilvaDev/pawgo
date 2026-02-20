import { EventType } from '../enums/event-type.js';

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
