// SHARED: Este archivo se mantiene sincronizado manualmente entre api y web.
// Si lo modificás, actualizá también la copia en la otra app.
import { DogSize } from '../enums/dog-size';

export interface Lead {
    id: string;
    email: string;
    name?: string;
    dogSize?: DogSize;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateLeadDto {
    email: string;
    name?: string;
    dogSize?: DogSize;
    incentive?: string;
}
