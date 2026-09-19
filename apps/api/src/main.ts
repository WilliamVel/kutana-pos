import "reflect-metadata";
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new DetailedExceptionFilter());
  app.enableCors({ origin: allowedCorsOrigin(process.env.CORS_ORIGIN) });
  await app.listen(process.env.PORT ?? 3000, process.env.HOST ?? "0.0.0.0");
}

@Catch()
class DetailedExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DetailedExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<{ method?: string; url?: string }>();
    const response = http.getResponse<{ status: (code: number) => { json: (body: unknown) => void } }>();
    const status = exception instanceof HttpException ? exception.getStatus() : 500;

    this.logger.error(
      JSON.stringify({
        method: request.method,
        url: request.url,
        exception: describeException(exception),
      }),
    );

    const body = exception instanceof HttpException ? exception.getResponse() : { statusCode: status, message: "Internal server error" };
    response.status(status).json(body);
  }
}

function describeException(exception: unknown): unknown {
  if (exception instanceof AggregateError) {
    return {
      name: exception.name,
      message: exception.message,
      stack: exception.stack,
      errors: exception.errors.map((error) => describeException(error)),
    };
  }

  if (exception instanceof Error) {
    return {
      name: exception.name,
      message: exception.message,
      stack: exception.stack,
      cause: exception.cause === undefined ? undefined : describeException(exception.cause),
    };
  }

  return exception;
}

type CorsOriginCallback = (error: Error | null, allow?: boolean) => void;

function allowedCorsOrigin(corsOrigin: string | undefined): (origin: string | undefined, callback: CorsOriginCallback) => void {
  const configuredOrigins = parseCorsOrigins(corsOrigin);

  return (origin, callback) => {
    if (!origin || configuredOrigins.includes(origin) || isLocalDevWebOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(null, false);
  };
}

function parseCorsOrigins(corsOrigin: string | undefined): string[] {
  return (corsOrigin ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

function isLocalDevWebOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return (
      url.protocol === "http:" &&
      url.port === "5173" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1" || isPrivateIpv4(url.hostname))
    );
  } catch {
    return false;
  }
}

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }

  const first = parts[0] ?? -1;
  const second = parts[1] ?? -1;
  return first === 10 || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168);
}

bootstrap();
