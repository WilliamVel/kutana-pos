import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: allowedCorsOrigins(process.env.CORS_ORIGIN) });
  await app.listen(process.env.PORT ?? 3000);
}

function allowedCorsOrigins(corsOrigin: string | undefined): string[] {
  if (!corsOrigin) {
    return ["http://localhost:5173", "http://127.0.0.1:5173"];
  }

  return corsOrigin
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

bootstrap();
