import type { Uuid } from '../../shared/types/common.js';

export type UserId = Uuid;

export interface CreateUserInput {
  email: string;
  displayName: string;
  cognitoSub: string;
}

export interface UserAccount {
  id: UserId;
  email: string;
  displayName: string;
  cognitoSub: string;
  accountStatus: 'active' | 'suspended' | 'deleted';
}
