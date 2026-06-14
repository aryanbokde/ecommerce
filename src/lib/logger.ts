import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

const isDev = process.env.NODE_ENV !== "production";

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "blue",
};

winston.addColors(colors);

const baseFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format((info) => ({
    ...info,
    service: "ecommerce-app",
    environment: process.env.NODE_ENV ?? "development",
  }))()
);

const jsonFormat = winston.format.combine(baseFormat, winston.format.json());

const prettyFormat = winston.format.combine(
  baseFormat,
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
    // `environment` is recorded in JSON logs but omitted from the pretty dev line.
    delete meta.environment;
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `${timestamp} [${service}] ${level}: ${message}${metaStr}`;
  })
);

const consoleTransport = new winston.transports.Console({
  format: isDev ? prettyFormat : jsonFormat,
});

// Serverless platforms (Vercel, AWS Lambda, Netlify) have a READ-ONLY filesystem
// — only /tmp is writable. The file transports below mkdir a `logs/` dir at
// construction, which throws ENOENT there and crashes every route. So on
// serverless we log to the console only (the platform captures stdout/stderr).
const isServerless =
  !!process.env.VERCEL ||
  !!process.env.AWS_LAMBDA_FUNCTION_NAME ||
  !!process.env.NETLIFY;

const transports: winston.transport[] = [consoleTransport];

if (!isServerless) {
  transports.push(
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      format: jsonFormat,
    }),
    new winston.transports.File({
      filename: "logs/combined.log",
      format: jsonFormat,
    }),
    new DailyRotateFile({
      filename: "logs/app-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxFiles: "14d",
      maxSize: "20m",
      format: jsonFormat,
    })
  );
}

const logger = winston.createLogger({
  level: isDev ? "debug" : "info",
  levels,
  transports,
});

export default logger;

export function logError(
  error: unknown,
  context?: {
    level?: "error" | "warn";
    code?: string;
    statusCode?: number;
    userId?: string;
    route?: string;
    method?: string;
    userAgent?: string;
    ipAddress?: string;
    metadata?: Record<string, unknown>;
  }
): void {
  const isError = error instanceof Error;
  const message = isError ? error.message : String(error);
  const stack = isError ? error.stack : undefined;
  const name = isError ? error.name : "UnknownError";
  const level = context?.level ?? "error";

  logger[level](message, { name, stack, ...context });

  // Persist to the DB (fire-and-forget). Guarded + dynamically imported so the
  // Prisma-backed service never reaches the client bundle, and a persistence
  // failure never throws back into the caller's flow.
  if (typeof window === "undefined" && (level === "error" || level === "warn")) {
    void import("@/server/services/error-log.service")
      .then(({ saveErrorLog }) =>
        saveErrorLog({
          level,
          message,
          stack,
          code: context?.code,
          statusCode: context?.statusCode,
          userId: context?.userId,
          route: context?.route,
          method: context?.method,
          userAgent: context?.userAgent,
          ipAddress: context?.ipAddress,
          metadata: context?.metadata,
        })
      )
      .catch(() => {
        /* never let error-log persistence break the caller */
      });
  }
}

/** Returns a child logger bound to a single request's context. */
export function requestLogger(context: {
  requestId: string;
  userId?: string;
  route: string;
}) {
  return logger.child(context);
}
