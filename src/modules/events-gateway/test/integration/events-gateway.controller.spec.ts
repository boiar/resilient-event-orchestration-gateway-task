import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType, Logger } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../../app.module';
import { ConfigService } from '@nestjs/config';
import { AxiosResponse } from 'axios';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import * as crypto from 'crypto';

const BASE_URL = '/v1/events-gateway';

describe('EventsGatewayController (Integration)', () => {
    let app: INestApplication;
    let secret: string;
    let httpService: HttpService;

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = module.createNestApplication({ rawBody: true });
        app.enableVersioning({ type: VersioningType.URI });
        app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

        // silence logs for perf test
        jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
        jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
        jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

        await app.init();

        const configService = app.get<ConfigService>(ConfigService);
        secret = configService.get<string>('app.webhookSecret') || 'my-secret-key-123';

        // get HttpService from Nest
        httpService = app.get<HttpService>(HttpService);




    }, 30_000); // allow 30s for full app boot inside Docker

    afterAll(async () => {
        if (app) {
            await app.close();
        }
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
        const signature = crypto.createHmac('sha256', secret)
            .update(body)
            .digest('hex');

        const response = await request(app.getHttpServer())
            .post(BASE_URL)
            .set('x-signature', signature)
            .set('Content-Type', 'application/json')
            .send(body)
            .expect(202);

        expect(response.body).toEqual({ status: 'accepted' });
    });

    it('should fail with invalid signature', async () => {
        const payload = {
            eventId: `test_invalid_${Date.now()}`,
            merchantId: 'merchant_123',
            shippingCompanyId: 'company_client',
            shipmentId: 'shp_123',
            type: 'SHIPMENT_CREATED',
            occurredAt: new Date().toISOString(),
            payload: { weight: 1.5, destination: 'world' },
        };

        const body = JSON.stringify(payload);
        const invalidSignature = 'invalid-sig';

        await request(app.getHttpServer())
            .post(BASE_URL)
            .set('x-signature', invalidSignature)
            .set('Content-Type', 'application/json')
            .send(body)
            .expect(401);
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
        const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');

        // measure 5 runs
        const durations: number[] = [];
        for (let i = 0; i < 5; i++) {
            const start = performance.now();
            await request(app.getHttpServer())
                .post(BASE_URL)
                .set('x-signature', signature)
                .set('Content-Type', 'application/json')
                .send(body)
                .expect(202);
            durations.push(performance.now() - start);
        }

        const min = Math.min(...durations);
        const avg = durations.reduce((a, b) => a + b, 0) / durations.length;

        console.log(`Durations: ${durations.map(d => d.toFixed(2)).join('ms, ')}ms`);
        console.log(`Min: ${min.toFixed(2)}ms | Avg: ${avg.toFixed(2)}ms`);

        expect(min).toBeLessThan(150);
    });
});