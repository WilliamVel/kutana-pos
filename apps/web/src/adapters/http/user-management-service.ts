import type { CreateManagedAuthUserInput, ManagedAuthUser, ResetManagedAuthUserPinInput } from "@kutana/shared/auth/model/user-management.js";
import type { UserManagementService } from "@kutana/shared/auth/ports/user-management-service.js";
import { encodePathSegment, HttpClient, type HttpClientOptions } from "./http-client.js";

export class HttpUserManagementService implements UserManagementService {
  private readonly http: HttpClient;

  constructor(options: HttpClientOptions = {}) {
    this.http = new HttpClient(options);
  }

  listUsers(): Promise<readonly ManagedAuthUser[]> {
    return this.http.request<readonly ManagedAuthUser[]>("/auth/users");
  }

  createUser(input: CreateManagedAuthUserInput): Promise<ManagedAuthUser> {
    return this.http.request<ManagedAuthUser>("/auth/users", {
      method: "POST",
      body: input,
    });
  }

  deactivateUser(id: string): Promise<ManagedAuthUser> {
    return this.http.request<ManagedAuthUser>(`/auth/users/${encodePathSegment(id)}`, {
      method: "DELETE",
    });
  }

  resetPin(input: ResetManagedAuthUserPinInput): Promise<void> {
    return this.http.request<void>(`/auth/users/${encodePathSegment(input.userId)}/reset-pin`, {
      method: "POST",
      body: { newPin: input.newPin },
    });
  }
}
