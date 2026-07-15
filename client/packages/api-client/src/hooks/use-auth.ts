'use client';

import { useMutation } from '@tanstack/react-query';
import {
  authApi,
  type AuthSession,
  type LoginInput,
  type SignupInput,
  type SignupResponse,
} from '../endpoints/auth';

export function useSignup() {
  return useMutation<SignupResponse, Error, SignupInput>({
    mutationFn: (input) => authApi.signup(input),
  });
}

export function useLogin() {
  return useMutation<AuthSession, Error, LoginInput>({
    mutationFn: (input) => authApi.login(input),
  });
}

export function useLogout() {
  return useMutation<void, Error, void>({
    mutationFn: () => authApi.logout(),
  });
}
