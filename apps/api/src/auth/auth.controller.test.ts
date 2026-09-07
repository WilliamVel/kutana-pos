import "reflect-metadata";
import { Test } from "@nestjs/testing";
import { describe, expect, it } from "vitest";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";

describe("AuthController", () => {
  it("posts credentials to AuthService and returns an auth session", async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [AuthService],
    }).compile();
    const controller = moduleRef.get(AuthController);

    expect(controller.login({ operator: "Mina", pin: "1234" })).toMatchObject({
      operatorId: "operator-mina",
      displayName: "Mina",
    });
  });
});
