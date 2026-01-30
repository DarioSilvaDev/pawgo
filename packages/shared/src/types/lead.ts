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
}

