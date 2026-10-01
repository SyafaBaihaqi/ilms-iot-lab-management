import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import categoryRoutes from './routes/category.routes';
import componentRoutes from './routes/component.routes';
import loanRoutes from './routes/loan.routes';
import deviceRoutes from './routes/device.routes';
import sensorRoutes from './routes/sensor.routes';
import dashboardRoutes from './routes/dashboard.routes';
import reportRoutes from './routes/report.routes';
import notificationRoutes from './routes/notification.routes';
import ticketRoutes from './routes/ticket.routes';
import auditRoutes from './routes/audit.routes';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import { startAllJobs } from './jobs';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;

// ===== Global Middleware =====
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(',') || true,
    credentials: true
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ===== Rate Limiting (General + IoT endpoints) =====
const generalLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later', code: 'RATE_LIMITED' }
});

const deviceLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Device request limit exceeded', code: 'DEVICE_RATE_LIMITED' }
});

app.use('/api', generalLimiter);

// ===== Health Check =====
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    service: 'ILMS-Backend',
    time: new Date().toISOString()
  });
});

// ===== API Routes =====
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/components', componentRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/devices', deviceLimiter, deviceRoutes);
app.use('/api/sensors', deviceLimiter, sensorRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/audit-logs', auditRoutes);

// ===== 404 & Error Handler =====
app.use(notFoundHandler);
app.use(errorHandler);

// ===== Start Server & Background Jobs =====
// Hanya listen bila file ini dijalankan langsung (dev / `node dist/app.js`).
// Di dalam test, app di-import tanpa membuka port.
if (require.main === module) {
  if (process.env.NODE_ENV !== 'test') {
    startAllJobs();
  }

  app.listen(PORT, () => {
    console.log(`🤖 ILMS Backend API running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });
}

export { app };
export default app;