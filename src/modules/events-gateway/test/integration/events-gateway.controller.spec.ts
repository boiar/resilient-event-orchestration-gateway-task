import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import * as request from 'supertest';
import { EventsGatewayController } from '../../controllers/api/v1/events-gateway.controller';
import { EventsGatewayService } from '../../services/implemention/events-gateway.service';
import { HmacMiddleware } from '../../middlewares/hmac.middleware';
import * as crypto from 'crypto';

const BASE_URL = '/v1/events-gateway';
const SECRET = process.env.WEBHOOK_SECRET || 'my-secret-key-123';

@Module({
    controllers: [EventsGatewayController],
    providers: [
        {
            provide: EventsGatewayService,
            useValue: {
                eventsEnqueue: jest.fn().mockResolvedValue({ status: 'accepted' }),
            },
        },
    ],
})
class TestModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(HmacMiddleware).forRoutes(EventsGatewayController);
    }
}

describe('EventsGatewayController (with Stubs)', () => {
    let app: INestApplication;
    let service: EventsGatewayService;

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [TestModule],
        }).compile();

        app = module.createNestApplication({ rawBody: true });
        app.enableVersioning({ type: VersioningType.URI });
        app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
        await app.init();

        service = module.get<EventsGatewayService>(EventsGatewayService);
    });

    afterAll(async () => {
        await app.close();
    });

    it('should accept a request with valid signature and return accepted status', async () => {
        const payload = {
            eventId: `test_${Date.now()}`,
            merchantId: 'merchant_123',
            shippingCompanyId: 'company_client',
            shipmentId: 'shp_123',
            type: 'SHIPMENT_CREATED',
            occurredAt: new Date().toISOString(),
            payload: { weight: 1.5, destination: 'world' },
        };

        const body = JSON.stringify(payload);
        const signature = crypto.createHmac('sha256', SECRET)
            .update(body)
            .digest('hex');

        const response = await request(app.getHttpServer())
            .post(BASE_URL)
            .set('x-signature', signature)
            .set('Content-Type', 'application/json')
            .send(body)
            .expect(202);

        expect(response.body).toEqual({ status: 'accepted' });
        expect(service.eventsEnqueue).toHaveBeenCalledWith(expect.objectContaining({
            eventId: payload.eventId,
            merchantId: payload.merchantId,
        }));
    });

    it('should complete the request within 150ms', async () => {
        const payload = {
            eventId: `perf_test_${Date.now()}`,
            merchantId: 'merchant_123',
            shippingCompanyId: 'company_client',
            shipmentId: 'shp_perf_123',
            type: 'SHIPMENT_CREATED',
            occurredAt: new Date().toISOString(),
            payload: { weight: 1.5, destination: 'world' },
        };

        const body = JSON.stringify(payload);
        const signature = crypto.createHmac('sha256', SECRET).update(body).digest('hex');

        // warmup request — absorbs cold start cost, not measured
        await request(app.getHttpServer())
            .post(BASE_URL)
            .set('x-signature', signature)
            .set('Content-Type', 'application/json')
            .send(body);

        const startTime = performance.now();
        await request(app.getHttpServer())
            .post(BASE_URL)
            .set('x-signature', signature)
            .set('Content-Type', 'application/json')
            .send(body)
            .expect(202);
        const endTime = performance.now();

        const duration = endTime - startTime;
        console.log(`Request duration: ${duration.toFixed(2)}ms`);

        expect(duration).toBeLessThan(150);
    });
});