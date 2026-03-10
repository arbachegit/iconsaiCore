/**
 * Admin API Service
 * @version 1.0.0
 * @date 2026-02-04
 *
 * Secure admin operations through backend API.
 * Uses user's JWT token for authentication.
 * SERVICE_ROLE_KEY is kept secure on the backend.
 */

import { supabase } from "@/integrations/supabase/client";

// Use Voice API URL which points to our Python backend
const API_BASE_URL = process.env.NEXT_PUBLIC_VOICE_API_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

export interface AdminUser {
  id: string;
  auth_user_id?: string;
  email: string;
  first_name: string;
  last_name?: string;
  role: string;
  status: string;
  institution_id?: string;
  created_at?: string;
  last_login_at?: string;
}

export interface CreateUserData {
  email: string;
  password: string;
  first_name: string;
  last_name?: string;
  role?: string;
  institution_id?: string;
}

export interface UpdateUserData {
  first_name?: string;
  last_name?: string;
  role?: string;
  status?: string;
  institution_id?: string;
}

/**
 * Get the current user's auth token for API requests
 */
async function getAuthToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Não autenticado. Por favor, faça login novamente.");
  }

  return session.access_token;
}

/**
 * Create a new user (admin only)
 */
export async function createUser(data: CreateUserData): Promise<AdminUser> {
  const token = await getAuthToken();

  const response = await fetch(`${API_BASE_URL}/functions/v1/admin/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.detail?.error || result.error || "Erro ao criar usuário");
  }

  return result;
}

/**
 * List all users (admin only)
 */
export async function listUsers(limit = 100, offset = 0): Promise<{ users: AdminUser[]; total: number }> {
  const token = await getAuthToken();

  const response = await fetch(
    `${API_BASE_URL}/functions/v1/admin/users?limit=${limit}&offset=${offset}`,
    {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.detail?.error || result.error || "Erro ao listar usuários");
  }

  return result;
}

/**
 * Update a user (admin only)
 */
export async function updateUser(userId: string, data: UpdateUserData): Promise<AdminUser> {
  const token = await getAuthToken();

  const response = await fetch(`${API_BASE_URL}/functions/v1/admin/users/${userId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.detail?.error || result.error || "Erro ao atualizar usuário");
  }

  return result;
}

/**
 * Delete a user (admin only)
 */
export async function deleteUser(userId: string): Promise<void> {
  const token = await getAuthToken();

  const response = await fetch(`${API_BASE_URL}/functions/v1/admin/users/${userId}`, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const result = await response.json();
    throw new Error(result.detail?.error || result.error || "Erro ao deletar usuário");
  }
}
